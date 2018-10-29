(function ($) {
  $.SearchResultsContainer = function (options) {
    jQuery.extend(true, this, {
      windowId: undefined,
      element: null,
      appendTo: null,
      state: null,
      eventEmitter: null,

      context: null,
      config: null,
      baseObject: null,

    }, options);

    this.init();
  };

  $.SearchResultsContainer.prototype = {
    init: function () {
      this.element = jQuery(this.template()).appendTo(this.appendTo);
    },

    listenForActions: function () {

    },

    bindEvents: function () {
      this.element.find(".search-results-close").on("click", function() {
        _this.appendTo.find(".search-results-display").slideUp(160);
      });
    },

    changeContext: function (context) {
      this.context = context;
    },

    clear: function () {
      this.element.find('.search-results-list').empty();
    },

    handleSearchResults: function (searchResults) {
      // if (this.element.find('.search-results-display').length === 0) {
      //   this.element.append(jQuery(this.template()));
      // }
      this.element.find('.search-results-list').empty();

      if (!this.perPageCount) {
        this.perPageCount = searchResults.max_matches || searchResults.matches.length;
      }

      this.searchResults = new $.SearchResults({
        parentId: this.windowId,
        state: this.state,
        currentObject: this.baseObject,
        appendTo: this.element.find('.search-results-list'),
        eventEmitter: this.eventEmitter,
        context: this.context,
        config: this.config
      });

      let last = parseInt(searchResults.offset) + this.perPageCount;
      if (last > searchResults.total) {
        last = searchResults.total;
      }

      // TODO pager logic

      this.appendTo.find('.search-results-display').slideDown(160);
    },

    template: Handlebars.compile([
      '<div class="search-results-display" style="display:none;">',
        '<div class="search-results-close"><i class="fa fa-2x fa-caret-up" title="Close results"></i>Close results</div>',
        '<div class="search-results-container">',
          '<div class="results-pager"></div>',
          '<p class="results-pager-text"></p>',
          '<div class="search-results-list"></div>',
        '</div>',
      '</div>',
    ].join(''))
  };
}(Mirador));