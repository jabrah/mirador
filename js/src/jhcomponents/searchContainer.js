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
      windowId: null,
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
      facetPanel: null,
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

      this.bindEvents();
    },

    bindEvents: function () {
      const _this = this;

      this.eventEmitter.subscribe('SEARCH_CONTEXT_UPDATED', function (event, data) {
        if (data.origin !== _this.windowId) {
          return;
        }

        // On search service switch, clear advanced search rows
        // if (data.context.hasOwnProperty('searchService')) {
        //   delete _this.context.ui.advanced;
        // }

        jQuery.extend(true, _this.context, data.context);
        _this.searchWidget.changeContext(_this.context, true, true);
      });

      this.eventEmitter.subscribe('SEARCH_REQUESTED', function (event, data) {
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

      this.eventEmitter.subscribe('ADD_IIIF_OBJECT', function (event, data) {
        console.log('## ADD_IIIF_OBJECT');
        console.log(data);
        if (data.origin === _this.windowId) {
          _this.addIIIFObject(data);
        }
      });
    },

    /**
     * Add an object to this widget that you potentially want to search.
     * This object must be a JSON object of a IIIF object.
     *
     * @param object : IIIF object as JSON
     */
    addIIIFObject: function(object) {
      if (!object || typeof object !== "object") {
        return;
      }

      this.eventEmitter.publish("GET_RELATED_SEARCH_SERVICES", {
        "origin": this.windowId,
        "baseObject": object
      });
    },

    template: Handlebars.compile([
      '<div class="search-container" {{#if hidden}}style="display:none;"{{/if}}>',
      '</div>'
    ].join(''))
  };
}(Mirador));