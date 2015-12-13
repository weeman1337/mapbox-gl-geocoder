import MapboxClient from 'mapbox';
import Typeahead from 'suggestions';
import assign from 'lodash.assign';
import debounce from 'lodash.debounce';

export default class Geocoder extends mapboxgl.Control {

  options = {
    position: 'top-left',
    proximity: null
  }

  constructor(options) {
    super();
    this._ev = [];
    this.options = assign(this.options, options);
  }

  onAdd(map) {
    this.container = this.options.container ?
      typeof this.options.container === 'string' ?
      document.getElementById(this.options.container) :
      this.options.container :
      map.getContainer();

    // Template
    const el = document.createElement('div');
    el.className = 'mapboxgl-ctrl-geocoder';

    const icon = document.createElement('span');
    icon.classList.add('geocoder-icon', 'geocoder-icon-search');

    const input = this._inputEl = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search';

    input.addEventListener('keypress', debounce((e) => {
      this._queryInput(e.target.value);
    }), 100);

    input.addEventListener('change', () => {
      if (this._typeahead.selected) {
        const coords = this._typeahead.selected.center;
        // TODO set Input
        // Pan the map?
      }
    });

    const actions = document.createElement('div');
    actions.classList.add('geocoder-pin-right');

    const clear = this._clearEl = document.createElement('button');
    clear.classList.add('geocoder-icon', 'geocoder-icon-close');
    clear.addEventListener('click', this._clear);

    const loading = this._loadingEl = document.createElement('span');
    clear.classList.add('geocoder-icon', 'geocoder-icon-loading');

    actions.appendChild(clear);
    actions.appendChild(loading);

    el.appendChild(icon);
    el.appendChild(input);
    el.appendChild(actions);

    this.container.appendChild(el);
    this.client = new MapboxClient(this.options.accessToken ?
                                   this.options.accessToken :
                                   mapboxgl.accessToken);

    // Override the control being added to control containers
    if (this.options.container) this.options.position = false;

    this._typeahead = new Typeahead(input, []);
    this._typeahead.getItemValue = function(item) { return item.place_name; };

    return el;
  }

  // Private Methods
  // ============================
  _geocode(q, callback) {
    const options = this.options.proximity ? {
      proximity: {
        longitude: this.options.proximity[0],
        latitude: this.options.proximity[1]
      }
    } : {};

    return this.client.geocodeForward(q.trim(), options, (err, res) => {
      if (err) throw err;
      if (!res.features.length) this._typeahead.selected = null;
      this._typeahead.update(res.features);
      this._clearEl.classList.toggle('active', res.features.length);

      const onChange = document.createEvent('HTMLEvents');
      onChange.initEvent('change', true, false);

      // Adjust values if input is not :focus
      // or query remains unchanged.
      /*
      if (this._inputEl !== document.activeElement &&
          this._inputEl.value !== this.query) {
        this._inputEl.value = this.query;
        this._inputEl.dispatchEvent(onChange);
      }
      */

      return callback(res.features);
    });
  }

  _loading(loading) {
    this._loadingEl.classList.toggle('active', loading);
    if (loading) this.fire('geocoder.loading');
  }

  /*
   * Query input
   * @returns {Object} input
   */
  _queryInput(q) {
    this._loading(true);
    this._geocode(q, (results) => {
      this._loading(false);
      // return dispatch(inputResults(q, results));
    });
  }

  /*
   * Programmatic input query
   * @returns {Object} input
   */
  _query(input) {
    const q = (typeof input === 'string') ? input : input.join();
    this._loading(true);
    this._geocode(q, (results) => {
      this.loading(false);
      if (!results.length) return;
      // const result = results[0];
      // dispatch(queryInput(result.geometry.coordinates));
      // return dispatch(inputResults(result.place_name, results));
    });
  }

  _clear() {
    // TODO clear the input
    this.fire('geocoder.clear');
  }

  // API Methods
  // ============================

  /**
   * Return the input
   * @returns {Object} input
   */
  getInput() {
    return this._input;
  }

  /**
   * Set input
   * @param {Array|String} query An array of coordinates [lng, lat] or location name as a string.
   * @returns {Geocoder} this
   */
  setInput(query) {
    this._query(query);
    return this;
  }

  /**
   * Subscribe to events that happen within the plugin.
   * @param {String} type name of event. Available events and the data passed into their respective event objects are:
   * - __geocoder.clear__ `Emitted when the input is cleared`
   * - __geocoder.loading__ `Emitted when the geocoder is looking up a query`
   * - __geocoder.input__ `{ feature } Fired when input is set`
   * - __geocoder.error__ `{ error } Error as string
   * @param {Function} fn function that's called when the event is emitted.
   * @returns {Geocoder} this;
   */
  on(type, fn) {
    this._ev[type] = this._ev[type] || [];
    this._ev[type].push(fn);
    return this;
  }

  fire(type, data) {
    if (!this._ev[type]) return;
    const listeners = this._ev[type].slice();
    for (var i = 0; i < listeners.length; i++) listeners[i].call(this, data);
    return this;
  }
}
