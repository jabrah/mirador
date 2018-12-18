(function ($) {
  $.WhatsNewModal = function (options) {
    jQuery.extend(this, {
      element: null,
      appendTo: null
    }, options);

    this.init();
  };

  $.WhatsNewModal.prototype = {
    init: function () {
      jQuery.get({
        url: 'build/mirador/whatsNew.html',
        // dataType: 'text/html'
      })
      .done(data => {
        this.element = jQuery(this.template(data)).appendTo(this.appendTo);
        this.element.find('#whats-new-modal').modal({
          show: true,
          backdrop: false
        });
      })
      .fail(error => console.log('%cFailed to load "whatsNew.html"', 'color:red'));
    },

    template: Handlebars.compile([
      '<div class="container">',
      '<div id="whats-new-modal" class="modal" tabindex="-1" role="dialog">',
        '<div class="modal-dialog modal-lg" role="document">',
          '<div class="modal-content">',
            // header
            // '<div class="modal-header">',
            //   '<h1>This is a moo!</h1>',
            //   '<button type="button" class="close" data-dismiss="modal" aria-label="Close">',
            //     '<span aria-hidden="true">&times;</span>',
            //   '</button>',
            // '</div>',
            // body
            '<div class="modal-body">',
              '{{{this}}}',
            '</div>',
            // footer
            '<div class="modal-footer">',
              '<button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
      '</div>'
    ].join(''))
  };
} (Mirador));
