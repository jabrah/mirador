(function($) {

/**
 * @param  {[type]} options init params, required
 *                          {
 *                          	parent: parent window that contains this widget,
 *                          	appendTo: the element in the parent to attach this widget,
 *                          	manifest: the Manifest object, containing manifest data/helper functions,
 *                          	searchService: search service,
 *                          	searchContext: config info from JH-IIIF Search Service info request,
 *                          }
 * @return {[type]}         Search Within widget
 */
$.SearchWidget = function(options) {

  jQuery.extend(this, {
    parent: null,   // Window object. To get window ID: this.parent.id
    windowId: null,
    widgetId: null,
    appendTo: null,
    element: null,
    width: 330,
    manifest: null, // Manifest object. To get search service: this.manifest.getSearchWithinService()
    searchService: null,
    messages: {
      'no-term': '<span class="error">No search term was found.</span>',
      'no-defaults': '<span class="error">No fields defined for basic search.</span>',
    },
    searchContext: {},
  }, options);

  var _this = this;

  this.searchService.initializer.always(function() {
    _this.init();
  });

};

$.SearchWidget.prototype = {

  init: function() {
    console.assert(this.searchService, '[SearchWidget] searchService MUST be supplied when creating this widget.');
    var _this = this;
    this.registerWidget();

    var templateData = {};
    templateData.search = this.searchService.search;
    templateData.search.manifest = {
      'id': this.manifest.getId(),
      'label': this.manifest.getLabel()
    };

    this.element = jQuery(this.template(templateData)).appendTo(this.appendTo);

    this.bindEvents();
    if (this.searchContext && this.searchContext.queryUrl) {
      this.searchFromUrl(this.searchContext.queryUrl);
    }
  },

  toggle: function() {
    this.element.stop().slideFadeToggle(300);
  },

  bindEvents: function() {
    var _this = this;

    jQuery.subscribe('tabSelected.' + this.windowId, function(event, data) {
      if (data.id === _this.widgetId) {
        _this.element.show();
      } else {
        _this.element.hide();
      }
    });

    this.element.find(".js-perform-query").on('submit', function(event){
        event.preventDefault();
        var messages = _this.element.find('.pre-search-message');
        var searchTerm = _this.element.find('.js-query').val();

        messages.empty();

        if (_this.searchService.getDefaultFields().length === 0) {
          jQuery(_this.messages['no-defaults']).appendTo(messages);
        }

        if (searchTerm && searchTerm.length > 0) {
          var query = $.generateBasicQuery(
            searchTerm,
            _this.searchService.getDefaultFields(),
            _this.searchService.query.delimiters.or
          );
          if (query && query.length > 0) {
            _this.displaySearchWithin(query);
          }
        } else {
          jQuery(_this.messages['no-term']).appendTo(messages);
        }
    });

    if (this.searchService.search.settings.fields.length > 0) {
      this.element.find('.search-disclose-btn-more').on('click', function() {
        _this.element.find('#search-form').hide('fast');
        _this.element.find('.search-disclose').show('fast');
        _this.element.find('.search-disclose-btn-more').hide();
        _this.element.find('.search-disclose-btn-less').show();
      });

      this.element.find('.search-disclose-btn-less').on('click', function() {
        _this.element.find('#search-form').show('fast');
        _this.element.find('.search-disclose').hide('fast');
        _this.element.find('.search-disclose-btn-less').hide();
        _this.element.find('.search-disclose-btn-more').show();
      });

      this.addAdvancedSearchLine();

      this.element.find(".perform-advanced-search").on('submit', function(event) {
        event.preventDefault();
        _this.element.find('.pre-search-message').empty();
        _this.performAdvancedSearch();
      });

      this.element.find('.advanced-search-add-btn').on('click', function(e) {
        e.preventDefault();
        _this.addAdvancedSearchLine();
      });

      this.element.find('.advanced-search-reset-btn').on('click', function(e) {
        e.preventDefault();
        _this.element.find('.advanced-search-line').each(function(index, line) {
          jQuery(line).remove();
        });
        _this.addAdvancedSearchLine();
      });
    }
  },

  /**
   * Execute the search by making a request to the search service.
   * The query fragments from the UI elements must first be adapted
   * into the standard query format before being sent to the server.
   */
  performAdvancedSearch: function() {
    var _this = this;
    var parts = [];

    this.element.find('.advanced-search-line').each(function(index, line) {
      line = jQuery(line);
      var category = line.find('.advanced-search-categories').val();
      var operation = line.find('.advanced-search-operators').val();

      var inputs = line.find('.advanced-search-inputs').children()
      .filter(function(index, child) {
        child = jQuery(child);
        return child.css('display') != 'none' && child.val() && child.val() !== '';
      })
      .each(function(index, child) {
        child = jQuery(child);

        parts.push({
          op: _this.searchService.query.delimiters[operation],
          category: child.data('query'),
          term: child.val()
        });
      });
    });

    var finalQuery = $.generateQuery(parts, this.searchService.query.delimiters.field);

    if (finalQuery && finalQuery.length > 0) {
      this.displaySearchWithin(finalQuery, _this.searchService.query.delimiters.and);
    }
  },

  searchFromUrl: function(url) {
    console.assert(url && url.length > 0, '[SearchWidget#searchFromUrl] Must provide a URL.');
    if (!url || url.length === 0) {
      return;
    }
    var _this = this;

    this.element.find('.search-results-list').empty();
    new $.SearchWithinResults({
      manifest: _this.manifest,
      appendTo: _this.element.find('.search-results-list'),
      parent: _this,
      canvasID: _this.parent.currentCanvasID,
      baseUrl: _this.element.find('.search-within-object-select').val(),
      searchContext: _this.searchContext,
      // queryUrl: url,
      // selectedResult: _this.selectedResult,
    });
  },

  displaySearchWithin: function(query){
    var _this = this;
    if (query !== "") {
console.log("[SearchWidget] original : " + query);
      query = encodeURIComponent(query);

      this.element.find('.search-results-list').empty();
      new $.SearchWithinResults({
        manifest: _this.manifest,
        appendTo: _this.element.find(".search-results-list"),
        parent: _this,
        panel: true,
        canvasID: _this.parent.currentCanvasID,
        imagesList: _this.imagesList,
        thumbInfo: {thumbsHeight: 80, listingCssCls: 'panel-listing-thumbs', thumbnailCls: 'panel-thumbnail-view'},
        query: query,
        searchContext: _this.searchContext,
        baseUrl: _this.element.find('.search-within-object-select').val(),
        // selectedResult: _this.searchContext.selectedResult
      });
    }
  },

  /**
   * Add a new line to the Advanced Search widget.
   */
  addAdvancedSearchLine: function() {
    var _this = this;
    var template = Handlebars.compile('{{> advancedSearchLine }}');

    var templateData = {
      'search': this.searchService.search,
      'query': this.searchService.query
    };
    // templateData.search.categories.choices = this.searchService.query.fields;

    var line = template(templateData);

    line = jQuery(line).insertAfter(
      this.element.find('.advanced-search-lines table tbody').children().last()
    );

    // For only the first line, hide the boolean operator
    var num_lines = this.element.find('.advanced-search-line').length;
    if (num_lines === 1) {
      line.find('.advanced-search-operators').hide();
    }

    // Hide all inputs except for the Default choice
    // Makes sure ENTER key presses activate advanced search
    this.searchService.search.settings.fields.forEach(function (field) {
      var element = line.find(_this.classNamesToSelector(field.class));

      element.keypress(function(event) {
        if (event.which == 13) {
          event.preventDefault();
          _this.performAdvancedSearch();
        }
      });

      if (!field.default && field.class && field.class !== '') {
        element.hide();
      }
    });

    // Add functionality to 'remove' button
    line.find('.advanced-search-remove').on('click', function() {
      line.remove();

      // Make sure 1st line has boolean operator hidden
      _this.element.find('.advanced-search-line').each(function(index, element) {
        if (index === 0) {
          jQuery(element).find('.advanced-search-operators').hide();
        } else {
          jQuery(element).find('.advanced-search-operators').show();
        }
      });
    });

    line.find('.advanced-search-categories').on('change', function(event) {
      var jSelector = jQuery(event.target);
      var user_inputs = line.find('.advanced-search-inputs');

      // Hide all input/select fields
      user_inputs.find('select').hide();
      user_inputs.find('input').hide();

      user_inputs.find(
        _this.classNamesToSelector(
          _this.searchService.getField(jSelector.val()).class
        )
      ).show();
    });

  },

  classNamesToSelector: function(name) {
    // Convert class name(s) to CSS selectors
    var selector = '';
    name.split(/\s+/).forEach(function(str) {
      if (str.charAt(0) !== '.') {
        selector += '.';
      }
      selector += str + ' ';
    });

    return selector;
  },

  registerWidget: function() {
    /*
     * Search within widget template
     * Uses default Window context.
     *
     * Example usage: {{> searchWithinWidget }}
     */
    Handlebars.registerPartial('searchWithinWidget',[
      '<div class="searchResults" style="display: none;">',
        // SearchWithin selector
        '<div class="">',
          '<p>',
            'Search within: ',
            '<select class="search-within-object-select">',
              '<option value="{{search.manifest.id}}">{{search.manifest.label}}</option>',
              '<option value="{{search.collection.id}}">{{search.collection.label}}</option>',
            '</select>',
          '</p>',
        '</div>',
        '<form id="search-form" class="js-perform-query">',
          '<input class="js-query" type="text" placeholder="search"/>',
          '<input type="submit"/>',
        '</form>',
        '<div class="search-disclose-btn-more">Advanced Search</div>',
        '<div class="search-disclose-btn-less" style="display: none;">Basic Search</div>',
        '<div class="search-disclose-container">',
          '<div class="search-disclose" style="display: none;">',
            '{{> advancedSearch }}',
          '</div>',
        '</div>',
        '<p class="pre-search-message"></p>',
        '<div class="search-results-list"></div>',
      '</div>',
    ].join(''));

    Handlebars.registerPartial('advancedSearch', [
      '<div class="advanced-search">',
        '<form id="advanced-search-form" class="perform-advanced-search">',
          '<div class="advanced-search-lines">',
            '<table><tbody>',
              '<tr></tr>',
            '</tbody></table>',
          '</div>',
          '<div class="advanced-search-btn-container">',
            '<button class="advanced-search-add-btn" value="add">Add Term</button>',
            '<button class="advanced-search-reset-btn">Reset</button>',
          '</div>',
          '<input type="submit" value="Search"/>',
        '</form>',
      '</div>'
    ].join(''));

    Handlebars.registerPartial('advancedSearchLine', [
      // Select search category
      '<tr class="advanced-search-line"><td>',
        '<div class="advanced-search-selector">',
          '{{> searchDropDown query.operators}}',
          '{{> searchDropDown search.categories }}',
        '</div>',
      '</td>',
      '<td>',
        '<div class="advanced-search-inputs">',
        '{{#each search.settings.fields}}',
          '{{#ifCond type "===" "dropdown"}}',
            '{{> searchDropDown this}}',
          '{{/ifCond}}',
          '<input type="text" class="{{class}}" placeholder="{{placeholder}}" {{#if name}}data-query="{{name}}"{{/if}}/>',
        '{{/each}}',
        '</div>',
      '</td>',
      '<td>',
        '<button class="advanced-search-remove" type="button"><i class="fa fa-times"></i></button>',
      '</td></tr>',
    ].join(''));

    /**
     * Create a drop down. Required context:
     * {
     *   'label': human readable label for the dropdown
     *   'class': CSS class for the dropdown
     *   'choices': array of string options for the dropdown
     *   'query': OPTIONAL will go in data-query attribute
     *   'addBlank': OPTIONAL set to TRUE to add a blank option at the top
     * }
     */
    Handlebars.registerPartial('searchDropDown', [
      '<select class="{{class}}" {{#if name}}data-query="{{name}}{{/if}}">',
        '{{#if addBlank}}',
          '<option></option>',
        '{{/if}}',
        '{{#each choices}}',
          '<option value="{{#if value}}{{value}}{{else}}{{value}}{{/if}}">',
            '{{#if label}}{{label}}{{else}}{{label}}{{/if}}',
          '</option>',
        '{{/each}}',
      '</select>'
    ].join(''));

    $.registerHandlebarsHelpers();
  },

  template: Handlebars.compile([
    '{{> searchWithinWidget }}'
  ].join(''))

};

}(Mirador));
