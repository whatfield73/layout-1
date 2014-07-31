﻿/**
	_enyo.FittableLayout_ provides the base positioning and boundary logic for
	the fittable layout strategy. The fittable layout strategy is based on
	laying out items in either a set of rows or a set of columns, with most of
	the items having natural size, but one item expanding to fill the remaining
	space. The item that expands is labeled with the attribute _fit: true_.

	The subkinds [enyo.FittableColumnsLayout](#enyo.FittableColumnsLayout) and
	[enyo.FittableRowsLayout](#enyo.FittableRowsLayout) (or _their_ subkinds)
	are used for layout rather than _enyo.FittableLayout_ because they specify
	properties that the framework expects to be available when laying items out.

	When available on the platform, you can opt-in to have _enyo.FittableLayout_ use CSS
	flexible box (flexbox) to implement fitting behavior on the platform for better 
	performance, and will fall back to JS-based layout on older platforms.
	There are three subtle differences between the flexbox and JS implementations
	that should be noted:

	* When using flexbox, vertical margins (`margin-top`, `margin-bottom`) will
		not collapse; when using JS layout, vertical margin will collapse according
		to static layout rules.
	* When using flexbox, non-fitting children of the Fittable must not be sized
		using percentages of the container (even if set to `position: relative`);
		this is explicitly not supported by the flexbox 2013 spec.
	* The flexbox-based Fittable implementation will respect multiple children
		with `fit: true` (the fitting space will be divided equally between them).
		This is NOT supported by the JS implementation, and should not be relied
		on if deploying to platforms without flexbox support.

	The flexbox implementation was added to Enyo 2.5.0 as a performance optimization;
	to opt-in to this optimization set `useFlex: true` on the
	Fittable container, which will result in the use of flexbox when possible - noting the
	subtle differences between the JS fittables implementation and flexbox.

	For more information, see the documentation on
	[Fittables](building-apps/layout/fittables.html) in the Enyo Developer Guide.
*/

enyo.kind({
	name: 'enyo.FittableLayout',
	kind: 'Layout',
	noDefer: true,

	//* @protected
	constructor: enyo.inherit(function (sup) {
		return function () {
			sup.apply(this, arguments);
			
			// Add the force-ltr class if we're in RTL mode, but this control is set explicitly to NOT be in RTL mode.
			this.container.addRemoveClass("force-left-to-right", (enyo.Control.prototype.rtl && !this.container.get("rtl")) );

			// Flexbox optimization is determined by global flexAvailable and per-instance opt-in useFlex flag
			this.useFlex = enyo.FittableLayout.flexAvailable && (this.container.useFlex === true);
			if (this.useFlex) {
				this.container.addClass(this.flexLayoutClass);
			} else {
				this.container.addClass(this.fitLayoutClass);
			}
		};
	}),
	calcFitIndex: function() {
		var aChildren = this.container.children,
			oChild,
			n;

		for (n=0; n<aChildren.length; n++) {
			oChild = aChildren[n];
			if (oChild.fit && oChild.showing) {
				return n;
			}
		}
	},

	getFitControl: function() {
		var aChildren = this.container.children,
			oFitChild = aChildren[this.fitIndex];

		if (!(oFitChild && oFitChild.fit && oFitChild.showing)) {
			this.fitIndex = this.calcFitIndex();
			oFitChild = aChildren[this.fitIndex];
		}
		return oFitChild;
	},

	shouldReverse: function() {
		return this.container.rtl && this.orient === "h";
	},

	getFirstChild: function() {
		var aChildren = this.getShowingChildren();

		if (this.shouldReverse()) {
			return aChildren[aChildren.length - 1];
		} else {
			return aChildren[0];
		}
	},

	getLastChild: function() {
		var aChildren = this.getShowingChildren();

		if (this.shouldReverse()) {
			return aChildren[0];
		} else {
			return aChildren[aChildren.length - 1];
		}
	},

	getShowingChildren: function() {
		var a = [],
			n = 0,
			aChildren = this.container.children,
			nLength   = aChildren.length;

		for (;n<nLength; n++) {
			if (aChildren[n].showing) {
				a.push(aChildren[n]);
			}
		}

		return a;
	},

	_reflow: function(sMeasureName, sClienMeasure, sAttrBefore, sAttrAfter) {
		this.container.addRemoveClass('enyo-stretch', !this.container.noStretch);

		var oFitChild       = this.getFitControl(),
			oContainerNode  = this.container.hasNode(),  // Container node
			nTotalSize     = 0,                          // Total container width or height without padding
			nBeforeOffset   = 0,                         // Offset before fit child
			nAfterOffset    = 0,                         // Offset after fit child
			oPadding,                                    // Object containing t,b,r,l paddings
			oBounds,                                     // Bounds object of fit control
			oLastChild,
			oFirstChild,
			nFitSize;

		if (!oFitChild || !oContainerNode) { return; }

		oPadding   = enyo.dom.calcPaddingExtents(oContainerNode);
		oBounds    = oFitChild.getBounds();
		nTotalSize = oContainerNode[sClienMeasure] - (oPadding[sAttrBefore] + oPadding[sAttrAfter]);

		if (this.shouldReverse()) {
			oFirstChild  = this.getFirstChild();
			nAfterOffset = nTotalSize - (oBounds[sAttrBefore] + oBounds[sMeasureName]);

			var nMarginBeforeFirstChild = enyo.dom.getComputedBoxValue(oFirstChild.hasNode(), 'margin', sAttrBefore) || 0;

			if (oFirstChild == oFitChild) {
				nBeforeOffset = nMarginBeforeFirstChild;
			} else {
				var oFirstChildBounds      = oFirstChild.getBounds(),
					nSpaceBeforeFirstChild = oFirstChildBounds[sAttrBefore];

				nBeforeOffset = oBounds[sAttrBefore] + nMarginBeforeFirstChild - nSpaceBeforeFirstChild;
			}
		} else {
			oLastChild    = this.getLastChild();
			nBeforeOffset = oBounds[sAttrBefore] - (oPadding[sAttrBefore] || 0);

			var nMarginAfterLastChild = enyo.dom.getComputedBoxValue(oLastChild.hasNode(), 'margin', sAttrAfter) || 0;

			if (oLastChild == oFitChild) {
				nAfterOffset = nMarginAfterLastChild;
			} else {
				var oLastChildBounds = oLastChild.getBounds(),
					nFitChildEnd     = oBounds[sAttrBefore] + oBounds[sMeasureName],
					nLastChildEnd    = oLastChildBounds[sAttrBefore] + oLastChildBounds[sMeasureName] +  nMarginAfterLastChild;

				nAfterOffset = nLastChildEnd - nFitChildEnd;
			}
		}

		nFitSize = nTotalSize - (nBeforeOffset + nAfterOffset);
		oFitChild.applyStyle(sMeasureName, nFitSize + 'px');
	},

	//* @public
	/**
		Assigns any static layout properties not dependent on changes to the
		rendered component or contaner sizes, etc.
	*/
	flow: function() {
		if (this.useFlex) {
			var i,
				children = this.container.children,
				child;
			this.container.addClass(this.flexLayoutClass);
			this.container.addRemoveClass("nostretch", this.container.noStretch);
			for (i=0; i<children.length; i++) {
				child = children[i];
				child.addClass("enyo-flex-item");
				child.addRemoveClass("flex", child.fit);
			}
		}
	},
	/**
		Updates the layout to reflect any changes made to the layout container or
		the contained components.
	*/
	reflow: function() {
		if (!this.useFlex) {
			if (this.orient == 'h') {
				this._reflow('width', 'clientWidth', 'left', 'right');
			} else {
				this._reflow('height', 'clientHeight', 'top', 'bottom');
			}
		}
	},
	statics: {
		flexAvailable: false
	}
});

/**
	_enyo.FittableColumnsLayout_ provides a container in which items are laid
	out in a set of vertical columns, with most of the items having natural
	size, but one expanding to fill the remaining space. The one that expands is
	labeled with the attribute _fit: true_.

	_enyo.FittableColumnsLayout_ is meant to be used as a value for the
	_layoutKind_ property of other kinds. _layoutKind_ provides a way to add
	layout behavior in a pluggable fashion while retaining the ability to use a
	specific base kind.

	For more information, see the documentation on
	[Fittables](building-apps/layout/fittables.html) in the Enyo Developer Guide.
*/
enyo.kind({
	name        : 'enyo.FittableColumnsLayout',
	kind        : 'FittableLayout',
	orient      : 'h',
	fitLayoutClass : 'enyo-fittable-columns-layout',
	flexLayoutClass: 'enyo-flex-container columns'
});


/**
	_enyo.FittableRowsLayout_ provides a container in which items are laid out
	in a set of horizontal rows, with most of the items having natural size, but
	one expanding to fill the remaining space. The one that expands is labeled
	with the attribute _fit: true_.

	_enyo.FittableRowsLayout_ is meant to be used as a value for the
	_layoutKind_ property of other kinds. _layoutKind_ provides a way to add
	layout behavior in a pluggable fashion while retaining the ability to use a
	specific base kind.

	For more information, see the documentation on
	[Fittables](building-apps/layout/fittables.html) in the Enyo Developer Guide.
*/
enyo.kind({
	name        : 'enyo.FittableRowsLayout',
	kind        : 'FittableLayout',
	fitLayoutClass : 'enyo-fittable-rows-layout',
	orient      : 'v',
	flexLayoutClass: 'enyo-flex-container rows'
});

// One-time flexbox feature-detection
(function() {
	var detector = document.createElement("div");
	enyo.FittableLayout.flexAvailable = 
		(detector.style.flexBasis !== undefined) ||
		(detector.style.webkitFlexBasis !== undefined) ||
		(detector.style.mozFlexBasis !== undefined) ||
		(detector.style.msFlexBasis !== undefined);
})();
