/**
	_enyo.CardSlideInArranger_ is an [enyo.Arranger](#enyo.Arranger) that
	displays only one active control. The non-active controls are hidden with
	_setShowing(false)_. Transitions between arrangements are handled by
	sliding the new control	over the current one.

	Note that CardSlideInArranger always slides controls in from the right. If
	you want an arranger that slides to the right and left, try
	[enyo.LeftRightArranger](#enyo.LeftRightArranger).

	For more information, see the documentation on
	[Arrangers](building-apps/layout/arrangers.html) in the Enyo Developer Guide.
*/
enyo.kind({
	name: "enyo.CardSlideInArranger",
	kind: "CardArranger",
	//* @protected
	start: function() {
		var c$ = this.container.getPanels();
		for (var i=0, c; (c=c$[i]); i++) {
			var wasShowing=c.showing;
			c.setShowing(i == this.container.fromIndex || i == (this.container.toIndex));
			if (c.showing && !wasShowing) {
				c.resize();
			}
		}
		var l = this.container.fromIndex;
		i = this.container.toIndex;
		this.container.transitionPoints = [
			i + "." + l + ".s",
			i + "." + l + ".f"
		];
	},
	finish: enyo.inherit(function(sup) {
		return function() {
			sup.apply(this, arguments);
			var c$ = this.container.getPanels();
			for (var i=0, c; (c=c$[i]); i++) {
				c.setShowing(i == this.container.toIndex);
			}
		};
	}),
	arrange: function(inC, inName) {
		var p = inName.split(".");
		var f = p[0], s= p[1], starting = (p[2] == "s");
		var b = this.containerBounds.width;
		for (var i=0, c$=this.container.getPanels(), c, v; (c=c$[i]); i++) {
			v = b;
			if (s == i) {
				v = starting ? 0 : -b;
			}
			if (f == i) {
				v = starting ? b : 0;
			}
			if (s == i && s == f) {
				v = 0;
			}
			this.arrangeControl(c, {left: v});
		}
	},
	destroy: enyo.inherit(function(sup) {
		return function() {
			var c$ = this.container.getPanels();
			for (var i=0, c; (c=c$[i]); i++) {
				enyo.Arranger.positionControl(c, {left: null});
			}
			sup.apply(this, arguments);
		};
	})
});
