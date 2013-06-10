$(function () {
  var canvasEl = $("#main-canvas").get(0);

  new StageView([canvasEl]);
});

var StageView = Createbone.View.extend({
  classType: "Stage"

, initialize: function () {
    this.circleModel = new CircleModel({ x: 100, y: 100 });
    this.circleView = new CircleView({ model: this.circleModel });

    this.el.addChild(this.circleView.el);

    this.el.update();

    _.bindAll(this, "onTick");

    //createjs.Ticker.addEventListener("tick", this.onTick);
  }

, onTick: function () {
    var x = this.circleModel.get("x");
    this.circleModel.set("x", x + 1);

    this.el.update();
  }
});

var CircleModel = Createbone.Model.extend({
  defaults: {
    x: 0
  , y: 0
  , fill: "#f00"
  , radius: 30
  }
});

var CircleView = Createbone.View.extend({
  classType: "Shape"

, events: {
    "mousedown": "onMouseDown"
  }

, initialize: function () {
    this.listenTo(this.model, "change:x", this.move);
    this.listenTo(this.model, "change:y", this.move);

    this.graphics.beginFill(this.model.get("fill"));
    this.graphics.drawCircle(0, 0, this.model.get("radius"));

    this.move();
  }

, move: function () {
    this.el.x = this.model.get("x");
    this.el.y = this.model.get("y");
  }

, onMouseDown: function () {
    this.remove();
  }
});
