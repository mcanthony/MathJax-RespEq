//
// Connection to SRE explorer.
//
MathJax.Hub.Register.StartupHook('Sre Ready', function() {
  var FALSE, KEY;
  MathJax.Hub.Register.StartupHook('MathEvents Ready', function() {
    FALSE = MathJax.Extension.MathEvents.Event.False;
    KEY = MathJax.Extension.MathEvents.Event.KEY;
  });

  var Explorer = MathJax.Extension.Explorer = {
    walker: null,
    highlighter: null,
    hoverer: null,
    flamer: null,
    speechDiv: null,
    enriched: {},
    //
    // Resets the explorer, rerunning methods not triggered by events.
    //
    Reset: function() {
      Explorer.FlameEnriched();
    },
    //
    // Registers new Maths and adds a key event if it is enriched.
    //
    Register: function(msg) {
      var script = document.getElementById(msg[1]);
      if (script && script.id) {
        var jax = MathJax.Hub.getJaxFor(script.id);
        if (jax && jax.enriched) {
          Explorer.enriched[script.id] = script;
          Explorer.AddEvent(script);
        }
      }
    },
    //TODO: Find the top-most elements (there can be multiple) and destroy
    // highlighter on mouse out only.
    // 
    GetHoverer: function() {
      Explorer.hoverer = sre.HighlighterFactory.highlighter(
        {color: Lab.background, alpha: .1},
        {color: Lab.foreground, alpha: 1},
        {renderer: MathJax.Hub.outputJax['jax/mml'][0].id,
         mode: 'hover', browser: MathJax.Hub.Browser.name}
      );
    },
    MouseOver: function(event) {
      if (Lab.highlight === 'none') return;
      if (Lab.highlight === 'hover') {
        var frame = event.currentTarget;
        Explorer.GetHoverer();
        Explorer.hoverer.highlight([frame]);
      }
      MathJax.Extension.MathEvents.Event.False(event);
    },
    MouseOut: function (event) {
      if (Explorer.hoverer) {
        Explorer.hoverer.unhighlight();
        Explorer.hoverer = null;
      }
      return  MathJax.Extension.MathEvents.Event.False(event);
    },
    //TODO: Make this work for multiple nodes!
    //      Flaming for MathML background via alternating colors.
    //
    GetFlamer: function() {
      Explorer.flamer = sre.HighlighterFactory.highlighter(
        {color: Lab.background, alpha: .05},
        {color: Lab.foreground, alpha: 1},
        {renderer: MathJax.Hub.outputJax['jax/mml'][0].id,
         mode: 'hover', browser: MathJax.Hub.Browser.name}
      );
    },
    Flame: function(node) {
      if (Lab.highlight === 'flame') {
        Explorer.GetFlamer();
        var nodes = Explorer.GetMactionNodes(node);
        for (var i = 0, n; n = nodes[i]; i++) {
          Explorer.flamer.highlight([n]);
        }
        return;
      }
      if (Explorer.flamer) {
        nodes = Explorer.GetMactionNodes(node);
        for (i = 0, l = nodes.length; i < l; i++) {
          Explorer.flamer.unhighlight();
        }
        Explorer.flamer = null;
      }
    },
    FlameEnriched: function() {
      for (var key in Explorer.enriched) {
        Explorer.Flame(Explorer.enriched[key].previousSibling);
      }
    },
    //TODO: Add counter to give up eventually.
    // 
    // 
    //
    // Adds mouse events to maction items in an enriched jax.
    // 
    // NOTE: Native MML does not work in Firefox due to MathML not implementing
    // the GlobalEventHandlers Interface.
    //
    AddMouseEvents: function(node) {
      var mactions = Explorer.GetMactionNodes(node);
      for (var i = 0, maction; maction = mactions[i]; i++) {
        switch (MathJax.Hub.outputJax['jax/mml'][0].id) {
        case 'HTML-CSS':
          maction.childNodes[0].onmouseover =
            maction.childNodes[1].onmouseover = Explorer.MouseOver;
          maction.childNodes[0].onmouseout =
            maction.childNodes[1].onmouseout = Explorer.MouseOut;
          break;
        case 'NativeMML':
        case 'CommonHTML':
          maction.onmouseover = Explorer.MouseOver;
          maction.onmouseout = Explorer.MouseOut;
          break;
        default:
          break;
        }
      }
    },
    GetMactionNodes: function(node) {
      switch (MathJax.Hub.outputJax['jax/mml'][0].id) {
      case 'NativeMML': 
        return node.getElementsByTagName('maction');
      case 'HTML-CSS':
        return node.getElementsByClassName('maction');
      case 'CommonHTML':
        return node.getElementsByClassName('mjx-maction');
      default:
        return [];
      }
     },
    //
    // Adds a key event to an enriched jax.
    //
    AddEvent: function(script) {
      var id = script.id + '-Frame';
      var sibling = script.previousSibling;
      if (sibling) {
        var math = sibling.id !== id ? sibling.firstElementChild : sibling;
        Explorer.AddMouseEvents(math);
        if (math.className === 'MathJax_MathML') {
          math = math.firstElementChild;
        }
        if (math) {
          math.onkeydown = Explorer.Keydown;
          return;
        }
      }
      MathJax.Hub.Queue(['AddEvent', Explorer, script]);
    },
    //
    // Event execution on keydown. Subsumes the same method of MathEvents.
    //
    Keydown: function(event) {
      if (event.keyCode === KEY.ESCAPE) {
        if (!Explorer.walker) return;
        Explorer.DeactivateWalker();
        FALSE(event);
        return;
      }
      // If walker is active we redirect there.
      if (Explorer.walker && Explorer.walker.isActive()) {
        if (event.keyCode === KEY.RETURN) {
          Explorer.DisplayBox(Explorer.walker.getFocus().getPrimary());
          FALSE(event);
          return;
        }
        var move = Explorer.walker.move(event.keyCode);
        if (move === null) return;
        if (move) {
          Explorer.Speak(Explorer.walker.speech());
          Explorer.Highlight();
        }
        FALSE(event);
        return;
      }
      var math = event.target;
      if (event.keyCode === KEY.SPACE) {
        if (event.shiftKey) {
          Explorer.ActivateWalker(math);
        } else {
          MathJax.Extension.MathEvents.Event.ContextMenu(event, math);
        }
        FALSE(event);
        return;
      }
    },
    //TODO: REFACTOR NOTES
    // -- Walker factory wrt global config.
    // -- Colour selector for highlighting with enum element.
    //
    // Activates the walker.
    //
    ActivateWalker: function(math) {
      Explorer.AddSpeech(math);
      var speechGenerator = new sre.DirectSpeechGenerator();
      Explorer.walker = new sre.SyntaxWalker(math, speechGenerator);
      Explorer.highlighter = sre.HighlighterFactory.highlighter(
          {color: Lab.background, alpha: .2},
          {color: Lab.foreground, alpha: 1},
          {renderer: MathJax.Hub.outputJax['jax/mml'][0].id,
           mode: 'walk', browser: MathJax.Hub.Browser.name}
      );
      Explorer.walker.activate();
      Explorer.Speak(Explorer.walker.speech());
      Explorer.Highlight();
    },
    //
    // Deactivates the walker.
    //
    DeactivateWalker: function() {
      Explorer.RemoveSpeech();
      Explorer.Unhighlight();
      Explorer.currentHighlight = null;
      Explorer.walker.deactivate();
      Explorer.walker = null;
    },
    //
    // Highlights the focused nodes.
    //
    Highlight: function() {
      Explorer.Unhighlight();
      Explorer.highlighter.highlight(Explorer.walker.getFocus().getNodes());
    },
    //
    // Unhighlights the old nodes.
    //
    Unhighlight: function() {
      Explorer.highlighter.unhighlight();
    },
    //
    // Adds the speech div.
    //
    AddSpeech: function(math) {
      if (!Explorer.speechDiv) {
        Explorer.speechDiv = MathJax.HTML.addElement(
            document.body, 'div', {className: 'MathJax_SpeechOutput',
              // style: {fontSize: '1px', color: '#FFFFFF'}}
              style: {fontSize: '12px', color: '#000000'}}
            );
        Explorer.speechDiv.setAttribute('aria-live', 'assertive');
      }
    },
    //
    // Removes the speech div.
    //
    RemoveSpeech: function() {
      if (Explorer.speechDiv) {
        Explorer.speechDiv.parentNode.removeChild(Explorer.speechDiv);
      }
      Explorer.speechDiv = null;
    },
    //
    // Speaks a string by poking it into the speech div.
    //
    Speak: function(speech) {
      Explorer.speechDiv.textContent = speech;
    },
    //
    // Displays an input box.
    //
    AttributeBox: function(node, attr) {
      return MathJax.HTML.Element(
        'div', {id: 'MathJax_Display_Box'
                // style: {
                //   margin: 'auto 5px', background: 'transparent'}
               },
        [['input', {type: 'text',
                    value: node.getAttribute('data-semantic-' + attr)
                    // style: {padding: '1px 1em'}
                   }],
         ['span', {},//style: {padding: '1px 1em'}},
          [attr]]
         ]);
    },
    ResetBox: function() {
      return MathJax.HTML.Element(
        'div', {id: 'MathJax_Cancel_Button', style: {'text-align': 'right'}},
        [['input', {type: 'submit', value: 'Cancel'}]]);
    },
    DisplayBox: function(node) {
      var offsetX = window.pageXOffset || document.documentElement.scrollLeft;
      var offsetY = window.pageYOffset || document.documentElement.scrollTop;
      var rect = node.getBoundingClientRect();
      // var x = (rect.right + rect.left) / 2 + offsetX;
      // var y = (rect.bottom + rect.top) / 2 + offsetY;
      var x = rect.right + offsetX;
      var y = rect.bottom + offsetY;
      var div = MathJax.HTML.Element(
        'div',
        {style: {
          position:"absolute", "background-color":"white", color:"black",
          width:"auto", padding: "5px 0px",
        border:"1px solid #CCCCCC", margin:0, cursor:"default",
        font: "menu", "text-align":"left", "text-indent":0, "text-transform":"none",
        "line-height":"normal", "letter-spacing":"normal", "word-spacing":"normal",
        "word-wrap":"normal", "white-space":"nowrap", "float":"none", "z-index":200,

        "border-radius": "5px",                     // Opera 10.5 and IE9
        "-webkit-border-radius": "5px",             // Safari and Chrome
        "-moz-border-radius": "5px",                // Firefox
        "-khtml-border-radius": "5px",              // Konqueror

        "box-shadow":"0px 10px 20px #808080",         // Opera 10.5 and IE9
        "-webkit-box-shadow":"0px 10px 20px #808080", // Safari 3 and Chrome
        "-moz-box-shadow":"0px 10px 20px #808080",    // Forefox 3.5
        "-khtml-box-shadow":"0px 10px 20px #808080",  // Konqueror
        filter: "progid:DXImageTransform.Microsoft.dropshadow(OffX=2, OffY=2, Color='gray', Positive='true')" // IE
      }});
      div.style.left = x+'px';
      div.style.top = y+'px';
      ['type', 'role', 'speech'].forEach(function(x) {
        div.appendChild(Explorer.AttributeBox(node, x));
      });
      // div.appendChild(Explorer.ResetBox());
      node.parentNode.insertBefore(div, node.nextSibling);
    }
  };

  MathJax.Hub.Register.MessageHook(
      'New Math', ['Register', MathJax.Extension.Explorer]);

});
