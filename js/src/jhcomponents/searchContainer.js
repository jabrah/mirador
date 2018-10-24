(function ($) {
  /**
   * This component is meant to contain and coordinate the different search elements,
   * whether it sits in a window's side panel, or the viewer's book browser.
   * 
   * Functions:
   *    #addIIIFObject(json) - 
   */
  $.SearchContainer = function (options) {
    jQuery.extend(true, this, {
      id: $.genUUID(),  // ID for this component
      windowId: undefined,
      tabId: null,
      parent: null,
      element: null,
      appendTo: null,
      state: null,
      eventEmitter: null,
      searchContext: null,
      searchConfig: null, // Default config found in settings.js
      
      baseObject: null,

      searchController: null,
      facetContainer: null,
      searchWidget: null,
      searchPicker: null,
      searchResults: null,

      /**
       * @param context {
       *    searchService: {
       *      id,
       *      query: {
       *        operators,
       *        delimiteres
       *      },
       *      search: {
       *        settings: {
       *          fields: [],
       *          'default-fields': []
       *        }
       *      }
       *    },
       *    search: {
       *      query: '',
       *      offset: -1, 
       *      maxPerPage: -1,
       *      resumeToken: '',  // NOT USED
       *      sortOrder: '',    // relevance|index
       *      selected: -1,     // Index of selected search result
       *      facetQuery: ''    
       *    },
       *    ui: {
       *      basic: '',        // Basic search term seen in the UI
       *      advanced: {       // This property will always override 'basic'
       *        rows: [
       *          {
       *            operator: '',   // and|or
       *            field: '',
       *            term: '',
       *            type: '',       // input|select
       *          },
       *          ...
       *        ]
       *      }
       *    }
       * }
       */
      context: null,
      config: {
        startHidden: true,
        advancedSearchActive: false,
        animated: false,
        hasContextMenu: true,
        allowFacets: true,
        inSidebar: false,
        showDescription: true,
        showCollectionPicker: true,
        showHideAnimation: 'fast'
      }
    }, options);

    this.init();
  };

  $.SearchContainer.prototype = {
    init: function () {
      this.element = jQuery(this.template({
        hidden: this.startHidden
      })).appendTo(this.appendTo);

      const baseConfig = {
        eventEmitter: this.eventEmitter,
        state: this.state,
        windowId: this.windowId,
        parent: this,
        appendTo: this.element,
        config: this.config,
        searchController: this.searchController
      };

      this.searchPicker = new $.SearchPicker(jQuery.extend(true, baseConfig, {
        baseObject: this.baseObject
      }));

      this.searchWidget = new $.SearchWidget(jQuery.extend(true, baseConfig, {
        context: this.context
      }));

      if (!this.config.inSidebar && this.config.allowFacets) {
        this.facetContainer = new $.FacetContainer(jQuery.extend(true, baseConfig, {}));
      }

      this.bindEvents();
    },

    bindEvents: function () {
      const _this = this;

      this.eventEmitter.subscribe('SEARCH_CONTEXT_UPDATED', (event, data) => {
        if (data.origin !== _this.windowId) {
          return;
        }
        _this.changeContext(data.context, true);
      });

      this.eventEmitter.subscribe('SEARCH_REQUESTED', (event, data) => {
        if (data.origin !== _this.windowId) {
          return;
        }

        const context = _this.context;
        const searchRequest = {
          origin: _this.windowId,
          service: context.searchService,
          query: context.search.query,
          offset: context.search.offset || 0,
          maxPerPage: context.search.maxPerPage || 30,
          sortOrder: context.search.sortOrder,
          facets: context.search.facetQuery
        };
        _this.eventEmitter.publish('SEARCH', searchRequest);
        _this.searchController.doSearch(searchRequest);
      });

      this.eventEmitter.subscribe('ADD_IIIF_OBJECT', (event, data) => {
        if (data.origin === _this.windowId) {
          _this.addIIIFObject(data.object);
        }
      });

      this.eventEmitter.subscribe('SWITCH_SEARCH_SERVICE', (event, data) => {
        console.log('SWITCH_SEARCH_SERVICE');
        console.log(data);
        if (data.origin === _this.windowId) {
          _this.switchSearchService(data.service);
        }
      });
    },

    changeContext: function (context, suppressEvent) {
        // On search service switch, clear advanced search rows
        // if (data.context.hasOwnProperty('searchService')) {
        //   delete _this.context.ui.advanced;
        // }
        jQuery.extend(true, this.context, context);
        this.searchWidget.changeContext(this.context, true, true);
        this.facetContainer.changeContext(this.context);

        if (!suppressEvent) {
          this.eventEmitter.publish('SEARCH_CONTEXT_UPDATED', {
            origin: this.windowId
          });
        }
    },

    /**
     * Add an object to this widget that you potentially want to search.
     * This object must be a JSON object of a IIIF object.
     *
     * @param object : IIIF object as JSON
     */
    addIIIFObject: function(object) {
      const _this = this;

      if (!object || typeof object !== "object") {
        return;
      }

      // At this point, the services are discovered, but not resolved. We do not
      // have the full service configurations yet.
      const searchSerivces = this.searchController.searchServicesInObject(object);
      searchSerivces.forEach(service => _this.searchPicker.addSearchService(service));
    },

    /**
     * @param {string|object} service the search service ID, or search service object with an 'id' property
     */
    getSearchService: function (service) {
      if (typeof service === 'object') {
        service = service.id;
      }
      const result = jQuery.Deferred();
      this.searchController.getSearchService(service)
        .done(s => result.resolve(s))
        .fail(() => result.reject());
      return result;
    },

    switchSearchService: function (service) {
      const _this = this;
      this.getSearchService(service).done(searchService => {
        _this.searchWidget.changeContext({
          searchService
        }, true, false);
      });
    },

    template: Handlebars.compile([
      '<div class="search-container" {{#if hidden}}style="display:none;"{{/if}}>',
      '</div>'
    ].join(''))
  };
}(Mirador));