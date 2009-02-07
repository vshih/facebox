/*
 * Facebox (for jQuery)
 * version: 1.2 (05/05/2008)
 * @requires jQuery v1.2 or later
 *
 * Examples at http://famspam.com/facebox/
 *
 * Licensed under the MIT:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2007, 2008 Chris Wanstrath [ chris@ozmm.org ]
 *
 * Usage:
 *
 *  jQuery(document).ready(function() {
 *    jQuery('a[rel*=facebox]').facebox(options)
 *  })
 *
 *  <a href="#terms" rel="facebox">Terms</a>
 *    Loads the #terms div in the box
 *
 *  <a href="terms.html" rel="facebox">Terms</a>
 *    Loads the terms.html page in the box
 *
 *  <a href="terms.png" rel="facebox">Terms</a>
 *    Loads the terms.png image in the box
 *
 *
 *  You can also use it programmatically:
 *
 *    jQuery.facebox('some html')
 *    jQuery.facebox('some html', 'my-groovy-style')
 *    jQuery.facebox('some html', options)
 *
 *  The above will open a facebox with "some html" as the content.
 *
 *    jQuery.facebox(function($) {
 *      $.get('blah.html', function(data) { $.facebox(data) })
 *    })
 *
 *  The above will show a loading screen before the passed function is called,
 *  allowing for a better ajaxy experience.
 *
 *  The facebox function can also display an ajax page, an image, or the contents of a div:
 *
 *    jQuery.facebox({ ajax: 'remote.html' })
 *    jQuery.facebox({ ajax: 'remote.html' }, 'my-groovy-style')
 *    jQuery.facebox({ ajax: 'remote.html' }, options)
 *    jQuery.facebox({ image: 'stairs.jpg' })
 *    jQuery.facebox({ image: 'stairs.jpg' }, 'my-groovy-style')
 *    jQuery.facebox({ image: 'stairs.jpg' }, options)
 *    jQuery.facebox({ div: '#box' })
 *    jQuery.facebox({ div: '#box' }, 'my-groovy-style')
 *    jQuery.facebox({ div: '#box' }, options)
 *
 *  Want to close the facebox?  Trigger the 'close.facebox' document event:
 *
 *    jQuery(document).trigger('close.facebox')
 *
 *  Facebox also has a bunch of other hooks:
 *
 *    loading.facebox
 *    beforeReveal.facebox
 *    reveal.facebox (aliased as 'afterReveal.facebox')
 *    init.facebox
 *    afterClose.facebox
 *
 *  Simply bind a function to any of these hooks:
 *
 *   $(document).bind('reveal.facebox', function() { ...stuff to do after the facebox and contents are revealed... })
 *
 *  Options and their defaults:
 *
 *    opacity      : 0
 *    fadeSpeed    : 200
 *    loadingImage : '/facebox/loading.gif'
 *    closeImage   : '/facebox/closelabel.gif'
 *    afterClose   : null
 *
 */
(function($) {
  var initialized = false;
  var imageTypesRegexp;

  $.facebox = function(data, options) {
    var opts = getOpts(options);

    $.facebox.loading(opts)

    if (data.ajax) fillFaceboxFromAjax(data.ajax, opts)
    else if (data.image) fillFaceboxFromImage(data.image, opts)
    else if (data.div) fillFaceboxFromHref(data.div, opts)
    else if ($.isFunction(data)) data.call($)
    else $.facebox.reveal(data, opts)
  }

  /*
   * Public, $.facebox methods
   */

  $.extend($.facebox, {
    settings: {
      // Per-call scope
      opacity      : 0,
      fadeSpeed    : 200,
      loadingImage : '/facebox/loading.gif',
      closeImage   : '/facebox/closelabel.gif',
      afterClose   : null,

      // Page scope
      imageTypes   : [ 'png', 'jpg', 'jpeg', 'gif' ],
      faceboxHtml  : '\
    <div id="facebox" style="display: none"> \
      <div class="popup"> \
        <table> \
          <tbody> \
            <tr> \
              <td class="tl" /><td class="b" /><td class="tr" /> \
            </tr> \
            <tr> \
              <td class="b" /> \
              <td class="body"> \
                <div class="title"></div> \
                <div class="content"> \
                </div> \
                <div class="footer"> \
                  <a href="#" class="close"> \
                    <img src="/facebox/closelabel.gif" title="close" class="close_image" /> \
                  </a> \
                </div> \
              </td> \
              <td class="b" /> \
            </tr> \
            <tr> \
              <td class="bl" /><td class="b" /><td class="br" /> \
            </tr> \
          </tbody> \
        </table> \
      </div> \
    </div>'
    },

    loading: function(opts) {
      if ($('#facebox .loading').length == 1) return true
      showOverlay(opts)

      $('#facebox .content').empty()
      $('#facebox .body').children().hide().end().
        append('<div class="loading"><img src="'+opts.loadingImage+'" /></div>')

      $('#facebox').css({
        top:    getPageScroll()[1] + (getPageHeight() / 10),
        left:   $(window).width() / 2 - 205
      }).show()

      $(document).bind('keydown.facebox', function(e) {
        if (e.keyCode == 27) $.facebox.close(opts)
        return true
      })
      $(document).trigger('loading.facebox', [opts])
    },

    reveal: function(data, opts) {
      $(document).trigger('beforeReveal.facebox', [opts])
      if (opts.cssClass) $('#facebox .content').addClass(opts.cssClass)
      if (opts.title)
          $('#facebox .title').html(opts.title)
      else
        $('#facebox .title').remove()
      $('#facebox .close_image').attr('src', opts.closeImage)
      $('#facebox .close').unbind('click').click(function() { $.facebox.close(opts); return false })
      $('#facebox .content').append(data)
      $('#facebox .loading').remove()
      $('#facebox .body').children().fadeIn(opts.fadeSpeed)
      $('#facebox').css('left', $(window).width() / 2 - ($('#facebox table').width() / 2))
      $(document).trigger('reveal.facebox', [opts]).trigger('afterReveal.facebox', [opts])
    },

    close: function(opts) {
      $(document).trigger('close.facebox', [opts])
      return false
    }
  })

  /*
   * Public, $.fn methods
   */

  $.fn.facebox = function(options) {
    var opts = getOpts(options)

    return this.bind('click.facebox', function() {
      $.facebox.loading(opts)

      // support for rel="facebox.inline_popup" syntax, to add a class
      // also supports deprecated "facebox[.inline_popup]" syntax
      var klass = this.rel.match(/facebox\[?\.(\w+)\]?/)
      if (klass) opts.cssClass = klass[1]

      fillFaceboxFromHref(this.href, opts)
      return false
    })
  }

  /*
   * Private methods
   */

  function getOpts(options) {
    init()

    var opts = {};

    if (typeof options == 'string')
      opts.cssClass = options;
    else
      $.extend(opts, $.facebox.settings, options);

    makeCompatible(opts)
    return opts
  }

  // called one time to setup facebox on this page
  function init() {
    if (initialized) return true
    initialized = true

    $(document).trigger('init.facebox')

    var imageTypes = $.facebox.settings.imageTypes.join('|')
    imageTypesRegexp = new RegExp('\.(' + imageTypes + ')$', 'i')

    $('body').append($.facebox.settings.faceboxHtml)

    // Preload
    new Image().src = $.facebox.settings.closeImage
    new Image().src = $.facebox.settings.loadingImage

    $('#facebox').find('.b:first, .bl, .br, .tl, .tr').each(function() {
      new Image().src = $(this).css('background-image').replace(/url\((.+)\)/, '$1')
    })
  }

  // getPageScroll() by quirksmode.com
  function getPageScroll() {
    var xScroll, yScroll;
    if (self.pageYOffset) {
      yScroll = self.pageYOffset;
      xScroll = self.pageXOffset;
    } else if (document.documentElement && document.documentElement.scrollTop) {     // Explorer 6 Strict
      yScroll = document.documentElement.scrollTop;
      xScroll = document.documentElement.scrollLeft;
    } else if (document.body) {// all other Explorers
      yScroll = document.body.scrollTop;
      xScroll = document.body.scrollLeft;
    }
    return new Array(xScroll,yScroll)
  }

  // Adapted from getPageSize() by quirksmode.com
  function getPageHeight() {
    var windowHeight
    if (self.innerHeight) {    // all except Explorer
      windowHeight = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
      windowHeight = document.body.clientHeight;
    }
    return windowHeight
  }

  // Backwards compatibility
  function makeCompatible(opts) {
    opts.loadingImage = opts.loading_image || opts.loadingImage
    opts.closeImage = opts.close_image || opts.closeImage
    opts.imageTypes = opts.image_types || opts.imageTypes
    opts.faceboxHtml = opts.facebox_html || opts.faceboxHtml
  }

  // Figures out what you want to display and displays it
  // formats are:
  //     div: #id
  //   image: blah.extension
  //    ajax: anything else
  function fillFaceboxFromHref(href, opts) {
    // div
    if (/#/.test(href)) {
      var url    = window.location.href.split('#')[0]
      var target = href.replace(url, '')
      $.facebox.reveal($(target).show().replaceWith("<div id='facebox_moved'></div>"), opts)

    // image
    } else if (imageTypesRegexp.test(href)) {
      fillFaceboxFromImage(href, opts)
    // ajax
    } else {
      fillFaceboxFromAjax(href, opts)
    }
  }

  function fillFaceboxFromImage(href, opts) {
    var image = new Image()
    image.onload = function() {
      $.facebox.reveal('<div class="image"><img src="' + image.src + '" /></div>', opts)
    }
    image.src = href
  }

  function fillFaceboxFromAjax(href, opts) {
    $.get(href, function(data) { $.facebox.reveal(data, opts) })
  }

  function skipOverlay(opts) {
    return opts.opacity == 0
  }

  function showOverlay(opts) {
    if (skipOverlay(opts)) return

    if ($('#facebox_overlay').length == 0)
      $("body").append('<div id="facebox_overlay" class="facebox_hide"></div>')

    $('#facebox_overlay').hide().addClass("facebox_overlayBG")
      .css('opacity', opts.opacity)
      .click(function() { $(document).trigger('close.facebox', [opts]) })
      .fadeIn(opts.fadeSpeed)
    return false
  }

  function hideOverlay(opts) {
    if (skipOverlay(opts)) return

    $('#facebox_overlay').fadeOut(opts.fadeSpeed, function() {
      $("#facebox_overlay").removeClass("facebox_overlayBG")
      $("#facebox_overlay").addClass("facebox_hide")
      $("#facebox_overlay").remove()
      if (opts.afterClose) opts.afterClose.call($)
      $(document).trigger('afterClose.facebox', [opts])
    })

    return false
  }

  /*
   * Bindings
   */

  $(document).bind('close.facebox', function(e, opts) {
    $(document).unbind('keydown.facebox')
    $('#facebox').fadeOut(opts.fadeSpeed, function() {
      if ($('#facebox_moved').length == 0) $('#facebox .content').removeClass().addClass('content')
      else $('#facebox_moved').replaceWith($('#facebox .content').children().hide())
      $('#facebox .loading').remove()
    })
    hideOverlay(opts)
  })

})(jQuery);
