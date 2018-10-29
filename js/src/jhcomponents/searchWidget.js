(function ($) {
  /**
   * This component contains the search UI. When a user interacts with this component and
   * initiates a search, this component emits a SEARCH_REQUESTED event that should be
   * handled in a different component.
   * 
   * Important functions:
   *    #changeContext(context) - this can be used from a parent component to force the
   *                              search context to change, such as if a different search 
   *                              service is selected. The UI will respond to a modified context
   *    #getSortOrder()
   *    #getSearchQuery()
   * 
   * Emits Events:
   *    - SEARCH_REQUESTED 
   *            data: {
   *              origin: '',     // window ID
   *              service: '',    // search service ID
   *              query: '',      // search query string
   *              offset: -1,     // search results offset for paging
   *              maxPerPage: -1, // max results to show per page
   *              resumeToken: '',// not used
   *              sortOrder: '',  // relevance|index
   *              facets: {},     // not used here
   *              ui: {}          // search UI information, in a form usable to initialize a search widget
   *            }
   *    - SEARCH_CONTEXT_UPDATED
   *            See 'context' documentation below. This event will only contain data that is updated,
   *            not the complete context.
   */
  $.SearchWidget = function (options) {
    jQuery.extend(true, this, {
      windowId: undefined,
      tabId: null,
      parent: null,
      element: null,
      appendTo: null,
      state: null,
      eventEmitter: null,
      
      searchController: null,

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
       *      selected: -1      // Index of selected search result
       *    },
       *    ui: {
       *      basic: '',        // Basic search term seen in the UI
       *      advanced: {       // This property will always override 'basic'
       *        rows: [
       *          {
       *            row: -1,        // row index
       *            operation: '',   // and|or
       *            category: '',
       *            term: '',
       *            type: '',       // input|select
       *          },
       *          ...
       *        ]
       *      }
       *    }
       * }
       */
      context: {
        searchService: null,
        search: {
          offset: 0,        // Default
          maxPerPage: 30    // Default
        },
        ui: {}
      },

      messages: {
        'no-term': jQuery('<span class=\"error\">No search term was found.</span>'),
        'no-defaults': jQuery('<span class=\"error\">No fields defined for basic search.</span>')
      }
    }, options);

    this.init();
  };

  $.SearchWidget.prototype = {
    init: function () {
      const _this = this;

      this.element = jQuery(this.template()).appendTo(this.appendTo);
      this.bindEvents();
      this.listenForActions();

      this.advancedSearch = new $.AdvancedSearchWidget({
        windowId: this.windowId,
        eventEmitter: this.eventEmitter,
        appendTo: this.element.find('.search-disclose'),
        clearMessages: () => { _this.element.find('.pre-search-message').empty(); },
        context: this.context,
        performAdvancedSearch: () => {
          const query = _this.advancedSearch.getQuery();
          if (query) {
            _this.doSearch(_this.context.searchService, query, _this.getSortOrder());
          }
        }
      });

      if (this.context) {
        this.initFromContext();
      }
    },

    bindEvents: function () {
      const _this = this;

      // this.eventEmitter.subscribe('SEARCH_CONTEXT_UPDATED', function (event, data) {
      //   if (data.origin === _this.windowId) {
      //     this.changeContext(data.context);
      //   }
      // });
    },

    listenForActions: function () {
      const _this = this;

      if (typeof this.config.showHideAnimation === "object") {
        this.config.showHideAnimation.progress = function() {
          _this.eventEmitter.publish("SEARCH_SIZE_UPDATED." + _this.windowId);
        };
      }

      this.element.find(".search-within-form").on("submit", function (event) {
        event.preventDefault();
        const messages = _this.element.find(".pre-search-message");
        const searchService = _this.context.searchService;

        messages.empty();

        if (searchService.config.getDefaultFields().length === 0) {
          _this.messages['no-defaults'].appendTo(messages);
        }

        const query = _this.getSearchQuery();
        if (query && query.length > 0) {
          _this.doSearch(searchService, query, _this.getSortOrder());
        } else {
          _this.messages['no-term'].appendTo(messages);
        }
      });

      // if (this.searchService.config.search.settings.fields.length > 0) {
      this.element.find(".search-disclose-btn-more").on("click", function() {
        _this.showAdvancedSearch();
      });

      this.element.find(".search-disclose-btn-less").on("click", function() {
        _this.hideAdvancedSearch();
      });
    },

    getSortOrder: function() {
      return this.element.find(".search-results-sorter select").val();
    },

    /**
     * Get the current search query string from the UI. Try to detect
     * where the query will come from, either basic or advanced
     * search widgets.
     *
     * Modify the query to account for any selected facets that would
     * narrow the search results.
     */
    getSearchQuery: function() {
      let query;

      const config = this.context.searchService.config;
      const delimiters = config.query.delimiters;

      if (this.element.find(".search-disclose-btn-more").css("display") != "none") {
        // Basic search is active
        const textbox = this.element.find(".js-query").val();
        if (textbox && textbox.length > 0) {
          query = $.generateBasicQuery(
            textbox,
            this.context.searchService.config.getDefaultFields(),
            delimiters.or
          );
        }
      } else {
        query = this.advancedSearch.getQuery();    // Advanced search is active
      }
      
      return query;
    },

    /**
     *
     * @param searchService : search service object
     * @param query : search query
     * @param sortOrder : (OPTIONAL) string specifying sort order of results
     * @param facets : (OPTIONAL) array of facet objects
     * @param page : (OPTIONAL) offset within results set
     * @param maxPerPage : (OPTIONAL) results to display per page
     * @param resumeToken : (OPTIONAL) string token possibly used by a search service
     */
    doSearch: function(searchService, query, sortOrder, facets, offset, maxPerPage, resumeToken) {
      let context = {
        search: {
          query,
          sortOrder
        },
        ui: this.getUIState()
      };

      this.changeContext(context, false);

      this.eventEmitter.publish("SEARCH_REQUESTED", {
        origin: this.windowId,
        query,
        sortOrder,
        ui: context.ui
      });

      this.eventEmitter.publish("SEARCH_SIZE_UPDATED." + this.windowId);
    },

    /**
     * Mutate the current context for the search widget.
     * 
     * @param context see documentation for this.context above
     * @param {boolean} init - rerender the search UI
     * @param {boolean} suppressEvent - no event is fired if this is TRUE. Useful if a context
     *                                  change comes from this widget and has already been applied
     */
    changeContext: function (context, init, suppressEvent) {
      if (context.searchService !== this.context.searchService) {
        // Search service change!
        this.advancedSearch.clearRows();
        this.advancedSearch.setContext(context, init);
      }
      jQuery.extend(true, this.context, context);
      if (!suppressEvent) {
        this.eventEmitter.publish('SEARCH_CONTEXT_UPDATED', {
          origin: this.windowId,
          context: this.context
        });
      }
      if (init) {
        this.initFromContext();
      }
    },

    /**
     * Setup the widget according to the current context. ui.advanced will always override
     * ui.basic, so that if the 'advanced' property of the 'ui' object is set, advanced
     * search will be displayed. 
     */
    initFromContext: function () {
      if (this.context.search.sortOrder) {
        this.element.find(".search-results-sorter select").val(this.context.search.sortOrder);
      }
      if (this.context.ui.advanced) {
        this.showAdvancedSearch();
        if (this.advancedSearch) {
          this.advancedSearch.setContext(this.context, true);
        }
      } else {
        const basic = this.context.ui.basic || '';
        this.element.find(".js-query").val(basic);
      }

      if (this.context.searchService && this.context.search.query) {
        // this.addSearchService(this.context.searchService);
        if (this.context.search.results) {
          // this.handleSearchResults(this.context.search.results);
        }
      }
    },

    getUIState: function () {
      const showAdvanced = this.element.find('.search-disclose-btn-more').css('dislpay') == 'none';
      return {
        basic: this.element.find('.js-query').val(),
        advanced: showAdvanced ? this.advancedSearch.searchState() : undefined
      };
    },

    showAdvancedSearch: function() {
      this.advancedSearchActive = true;
      this.element.find("#search-form").hide(this.config.showHideAnimation);
      this.element.find(".search-disclose").show(this.config.showHideAnimation);
      this.element.find(".search-disclose-btn-more").hide();
      this.element.find(".search-disclose-btn-less").show();
      this.eventEmitter.publish("SEARCH_SIZE_UPDATED." + this.windowId);
    },

    hideAdvancedSearch: function() {
      this.advancedSearchActive = false;
      this.element.find("#search-form").show(this.config.showHideAnimation);
      this.element.find(".search-disclose").hide(this.config.showHideAnimation);
      this.element.find(".search-disclose-btn-less").hide();
      this.element.find(".search-disclose-btn-more").show();
      this.eventEmitter.publish("SEARCH_SIZE_UPDATED." + this.windowId);
    },

    resultsPagerText: Handlebars.compile([
      '{{#if last}}',
        'Showing {{offset}} - {{last}} {{#if total}}out of {{total}}{{/if}}',
      '{{/if}}'
    ].join('')),

    template: Handlebars.compile([
      '<div class="search-widget">',
        '<form id="search-form" class="search-within-form">',
          '<input class="js-query" type="text" aria-label="Enter search query:" placeholder="search"/>',
          '<input type="submit" value="Search"/>',
        '</form>',
        '<div class="search-disclose-btn-more">Advanced Search</div>',
        '<div class="search-disclose-btn-less" style="display: none;">Basic Search</div>',
        '<div class="search-results-sorter">',
          '<label>Sort results by: ',
            '<select>',
              '<option value="relevance">Relevance</option>',
              '<option value="index">Page Order</option>',
            '</select>',
          '</label>',
        '</div>',
        '<div class="search-disclose-container">',
          '<div class="search-disclose" style="display: none;"></div>',
        '</div>',
      '</div>',
      // '<div class="search-results-display" style="display:none;">',
      //   '<div class="search-results-close"><i class="fa fa-2x fa-caret-up" title="Close results"></i>Close results</div>',
      //   '<div class="search-results-container">',
      //     '<div class="results-pager"></div>',
      //     '<p class="results-pager-text"></p>',
      //     '<div class="search-results-list"></div>',
      //   '</div>',
      // '</div>',
    ].join('')),
  };
}(Mirador));