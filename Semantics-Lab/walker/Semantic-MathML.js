//
//  The semantic-enrichment filter.
//
MathJax.Extension.SemanticMathML = {
  version: "1.0",
  enrich: false,
  running: false,
  //
  //  Names of attributes to force if set by mstyle
  //  (so SRE doesn't have to look these up)
  //
  mstyleLookup: {
    mi: ["mathvariant"],
    mo: ["mathvariant","accent","largeop","form","fence","separator","movablelimits"],
    mn: ["mathvariant"],
    mtext: ["mathvariant"],
    ms: ["mathvariant"],
    mfrac: ["linethickness"],
    mfenced: ["open","close","separators"],
    menclose: ["notation"],
    munder: ["accentunder"],
    mover: ["accent"],
    munderover: ["accent","accentunder"]
  },
  Filter: function (jax,id,script) {
    delete jax.enriched;
    this.running = true;
    if (this.enrich) jax.enriched = sre.Enrich.semanticMathmlSync(jax.root.toMathML());
    this.running = false;
  },
  Enable: function () {this.enrich = true},
  Disable: function () {this.enrich = false}
};
MathJax.Hub.postInputHooks.Add(["Filter",MathJax.Extension.SemanticMathML]);
//
//  Override toMathML's attribute function to include additional attributes
//  inherited from mstyle (so SRE doesn't have to look them up).
//  Eventually, this should be moved to toMathML.js directly
//
MathJax.Hub.Register.StartupHook("Sre Ready",function () {
  var MML = MathJax.ElementJax.mml,
      SMML = MathJax.Extension.SemanticMathML;
      
  MML.mbase.Augment({
    toMathMLattributes: function () {
      var defaults = (this.type === "mstyle" ? MML.math.prototype.defaults : this.defaults);
      var names = (this.attrNames||MML.copyAttributeNames),
          skip = MML.skipAttributes, copy = MML.copyAttributes,
          lookup = SMML.mstyleLookup[this.type]||[];
      var attr = [], ATTR = (this.attr||{});

      if (this.type === "math" && (!this.attr || !this.attr.xmlns))
        attr.push('xmlns="http://www.w3.org/1998/Math/MathML"');
      if (!this.attrNames) {
        for (var id in defaults) {if (!skip[id] && !copy[id] && defaults.hasOwnProperty(id)) {
          if (this[id] != null && this[id] !== defaults[id]) {
            if (this.Get(id,null,1) !== this[id]) this.toMathMLaddAttr(attr,id,this[id]);
          }
        }}
      }
      for (var i = 0, m = names.length; i < m; i++) {
        if (copy[names[i]] === 1 && !defaults.hasOwnProperty(names[i])) continue;
        value = ATTR[names[i]]; if (value == null) value = this[names[i]];
        if (value != null) this.toMathMLaddAttr(attr,names[i],value);
      }
      for (i = 0, m = lookup.length; i < m; i++) {
        id = lookup[i];
        if (defaults.hasOwnProperty(id) && !attr["_"+id]) {
          value = this.Get(id,1);
          if (value != null) this.toMathMLaddAttr(attr,id,value);
        }
      }
      this.toMathMLclass(attr);
      if (attr.length) return " "+attr.join(" "); else return "";
    },
    toMathMLaddAttr: function (attr,id,value) {
      attr.push(id+'="'+this.toMathMLquote(value)+'"');
      attr["_"+id] = 1;
    }
  });
  
  //
  //  Adjust setTeXclass for <mo> so that added elements don't
  //  cause unwanted space.
  //
  var TEXCLASS = MML.mo.prototype.setTeXclass;
  MML.mo.Augment({
    setTeXclass: function (prev) {
      var values = this.getValues("form","lspace","rspace"); // sets useMMLspacing
      if (this.useMMLspacing) {
        this.texClass = MML.TEXCLASS.NONE;
        return this;
      }
      if (this.attr && this.attr["data-semantic-added"]) {
        this.texClass = this.prevClass = MML.TEXCLASS.NONE;
        return prev;
      }
      return TEXCLASS.apply(this,arguments);
    }
  });
});
