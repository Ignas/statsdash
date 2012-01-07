$(function() {

  "use strict";

  // TODO: Config model
  var cfg = window.AppConfig;

  /* 
   * Graph Model
   */
  window.Graph = Backbone.Model.extend({
    defaults: {},
    initialize: function() {
      if (!this.get('title')) {
        this.set({title: this.get('target')[0]});
      }
    },
    toUrl: function(defaults) {
      var args = _.extend({}, defaults || {}, this.attributes);
      return $.param(args, true);
    }
  });

  /* 
   * Graph Collection
   */
  window.GraphList = Backbone.Collection.extend({
    model: Graph,
    localStorage: new Store('graphs')
  });

  /* 
   * Graph View
   * The DOM representaion of a Graph...
   */
  window.GraphView = Backbone.View.extend({
    tagName: 'section',
    template: _.template($('#graph-template').html()),
    initialize: function() {
      this.model.bind('change', this.updateImage, this);
      this.model.view = this;
    },
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.updateImage();
      return this;
    },
    events: {
      'click img': 'edit',
      'click button.primary': 'doneEdit',
      'click button.delete': 'remove',
      'keydown': 'catchKeys'
    },
    updateImage: function() {
      var dimensions = {
        width: ~~($('body').width() / 2),
        height: ~~($('body').height() / 3 - 20),
        t: Math.random()
      };
      var computedSrc = cfg.srcBase + this.model.toUrl(cfg.globalGraphOptions)+
                        '&' + $.param(dimensions, true);

      $(this.el).find('img').css({
        width: dimensions.width + 'px',
        height: dimensions.height + 'px'
      }).attr('src', decodeURIComponent(computedSrc));
    },
    edit: function() {
      $(this.el).addClass('edit');
    },
    // Close the `"editing"` mode, saving changes to the todo.
    doneEdit: function(e) {
      e.preventDefault();
      var $el = $(this.el);
      this.model.save({
        title: $el.find('.title').val(),
        target: $el.find('.target').val().split(/\s*\|\s*/)
      });
      $(this.el).removeClass("edit");
    },
    catchKeys: function(e) {
      if ($(this.el).hasClass('edit')){
        e.stopPropagation();
      }
    },
    remove: function(e){
      this.model.destroy();
      $(this.el).remove();
      e.stopPropagation();
    }
  });

  /*
   * Graph Selector View
   */
  window.GraphSelectorView = Backbone.View.extend({
    el: $('#graph-select'),
    initialize: function() {
      var self = this;
      for (var i in cfg.defaultGraphs){
        this.el.append('<option>'+i+'</option>');
      }
      this.el.change(function() {
        self.options.app.graph_set = self.el.val();
        self.options.app.trigger('reset');
      });
      if (!self.options.app.graph_set){
        self.options.app.graph_set = self.el.val();
      }
    },
    update: function() {
      this.el.attr('value', this.options.app.graph_set);
    }
  });

  /*
   * Time Selector View
   */
  window.TimeView = Backbone.View.extend({
    el: $('#from-select'),
    initialize: function() {
      var view = this;
      cfg.globalGraphOptions.from = this.el.val();
      this.el.change(function() {
        cfg.globalGraphOptions.from = this.value;
        view.trigger('change');
      });
    }
  });

  /*
   * Legend toggle
   */

   window.LegendToggle = Backbone.View.extend({
     el: $('#show_legend'),
     initialize: function() {
       var view = this;
       cfg.globalGraphOptions.hideLegend = !this.el.is(':checked');
       this.el.change(function() {
         cfg.globalGraphOptions.hideLegend = !view.el.is(':checked');
         view.trigger('change');
       });
     },
     toggle: function(){
       this.el.prop('checked', !this.el.prop('checked'));
       this.el.trigger('change');
     }
  });

  /*
   * The Application
   */
  window.AppView = Backbone.View.extend({
    el: $("#graph-app"),
    initialize: function() {
      var self = this;

      _.extend(this, Backbone.Events);
      this.bind('reset', function(){
        this.load();
      });

      // Graph selector
      this.graphSelectorView = new GraphSelectorView({app: this});
      this.graphSelectorView.bind('change', this.render, this);

      // Time selector
      this.timeView = new TimeView();
      this.timeView.bind('change', this.render, this);

      // Legend Toggle
      this.legendToggle = new LegendToggle();
      this.legendToggle.bind('change', this.render, this);

      // The graphs
      this.model.bind('add', this.addOne, this);
      this.model.bind('reset', this.addAll, this);
      this.model.bind('all', this.render, this);
      // this.model.fetch();
      if (!this.model.length) {
        this.load();
      }

      function render() {
        self.render.apply(self);
      }

      // Repaint every 15 seconds
      setInterval(render, 15000);

      // Repaint on window resize
      var timer = false;
      $(window).resize(function() {
        clearTimeout(timer);
        timer = setTimeout(render, 1000);
      });

      $('#refresh').click(function(e) {
          e.preventDefault();
          App.render();
      });

      // Handle window keydown events
      $(window).keydown(function(e) {
        switch (e.which) {
          case 76: // l
            self.legendToggle.toggle();
          case 82: // r
            App.render();
            break;
          case 191: // ? (shift + /)
            if (!e.shiftKey){
                break;
            }
          case 72: // h
            $('legend').toggleClass("show");
            e.preventDefault();
            break;
          case 221:
            App.render();
            break;
        }
      });
    },
    load: function() {
      var self = this;
      // Clear out old graphs
      this.model.reset();
      this.el.html('');

      _.each(cfg.defaultGraphs[this.graph_set], function(g) {
        self.model.create(g);
      });
      this.graphSelectorView.update();
    },
    addOne: function(graph) {
      var view = new GraphView({model: graph});
      this.el.append(view.render().el);
    },
    addAll: function() {
      this.model.each(this.addOne, this);
    },
    render: function() {
      this.model.each(function(g) {
        g.view.updateImage();
      });
    }
  });

  // Fire up the app.
  window.App = new AppView({
    model: new GraphList()
  });

});
