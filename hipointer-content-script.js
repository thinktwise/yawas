console.log("el hipointer-content-script.js !!");
var signedin = false;
var highlightswrapper = document.querySelector('#yawas_highlightswrapper');
var forecolor = "#000000";
var currentColor = 0; // This is used for default pre-highlight color
var button_clicked=false; // Used yo only update currentColor when an actual button is clicked
var hoverColor = 'lightgray';//'pink'
var hoverElement = null;
var lastHighlight = null;
var leftMark = '<<';//'&ldquo;'
var rightMark = '>>';//'&rdquo;'
var lenquote = rightMark.length;//2;

var googleColors = [];
googleColors[1] = 'yellow';             //googleColors['yellow'] = 'yellow';
googleColors[2] = '#0df';//'lightblue';   //googleColors['blue'] = '#0df';//'lightblue';
googleColors[4] = '#ff9999';               //googleColors['red'] = '#ff9999';
googleColors[8] = '#99ff99';             //googleColors['green'] = '#99ff99';
googleColors['white'] = 'transparent';         //googleColors['white'] = 'transparent';
var notRemapped = [];
var selecting = true;

/* @sscalvo: New encoding
Yawas stores colors with 4 strings ("blue", "green", "yellow", "red") in the request.couleur field
Thinktwise will make use of the request.couleur to bitwise encode Yawas colors + ["boder width", "color codes"]
We will use bitwise XOR operation on the code2color keys
*/ 


var cgreen = "#99DF4D";
var corange = "#FF9804";  
var cblue = "#53B6F6";
var cpink = "#F06295"; 
var cblack = "#000000"; 

const code_to_color = [ cblue, cpink, cgreen, corange ] ; // 

// ["boder width", "color codes"] for implementing thinktwise wheel
var code2color = {
  0b0000: ["thin thin thin thin", `lightgray lightgray lightgray lightgray`   ], // 0: no key-wheel selected, only thin gray borders to show text selected
  0b0001: ["thin thin medium thin", `lightgray lightgray ${cgreen} lightgray` ],  // 1: green         (bottom side of wheel)
  0b0010: ["thin thin thin medium", `lightgray lightgray lightgray ${cpink}`  ],     // 2: pink            (left of wheel)
  0b0011: ["thin thin medium medium", `lightgray lightgray ${cgreen} ${cpink}`],      // 3: green + pink
  0b0100: ["medium thin thin thin", `${cblue} lightgray lightgray lightgray`],    // 4: blue           (top of wheel)
  0b0101: ["medium thin medium thin", `${cblue} lightgray ${cgreen} lightgray`],     // 5: blue + yellow
  0b0110: ["medium thin thin medium", `${cblue} lightgray lightgray ${cpink}`],        // 6: blue + red
  0b0111: ["medium thin medium medium", `${cblue} lightgray ${cgreen} ${cpink}`],         // 7: blue + yellow + red
  0b1000: ["thin medium thin thin", `lightgray ${corange} lightgray lightgray`],   // 8: green          (right of wheel)
  0b1001: ["thin medium medium thin", `lightgray ${corange} ${cgreen} lightgray`],    // 9: green + yellow
  0b1010: ["thin medium thin medium", `lightgray ${corange} lightgray ${cpink}`],       // 10: green + red
  0b1011: ["thin medium medium medium", `lightgray ${corange} ${cgreen} ${cpink}`],        // 11: green + yellow + red
  0b1100: ["medium medium thin thin", `${cblue} ${corange} lightgray lightgray`],      // 12: blue + green 
  0b1101: ["medium medium medium thin", `${cblue} ${corange} ${cgreen} lightgray`],       // 13: blue + green + yellow
  0b1110: ["medium medium thin medium", `${cblue} ${corange} lightgray ${cpink}`],          // 14: blue + green + red
  0b1111: ["medium medium medium medium", `${cblue} ${corange} ${cgreen} ${cpink}`],          // 15: blue + green + yellow + red
}

// @sscalvo: Wont store color names anymore, but numbers (1,2,4,8) and all their combinations
//                          0      0b0001   0b0010     3     0b0100     5         6         7      0b1000      9         10        11        12       13        14        15
var yawas_rosetta = ["yellow", "yellow", "red", "yellow", "blue", "yellow", "yellow", "yellow", "lime", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow" ]

var ccc = 'rojo';

// --------------------  tippy popover creation  -----------------
// ● code is U+25CF
tippy_content = `<div>
  <p class="tippy_title" style="text-align:justify;text-justify:inter-word;">&nbsp;&nbsp;&nbsp;Clear &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Trust&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Target &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;New</p>
  <hr>
  <div class="tippy_list">
  <button  class="tippy_icons" id="obutton">
    <div class="tippy_circle" style="background-color:${corange}"></div>
  </button>
  <button  class="tippy_icons" id="bbutton">
    <div class="tippy_circle" style="background-color:${cgreen}"></div>                       <!-- ojo! boton BLUE bbuton + GREEN color  !!! -->
  </button>
  <button class="tippy_icons" id="gbutton">
    <div class="tippy_circle" style="background-color:${cblue}"></div>                        <!--  ojo! boton GREEN gbuton + BLUE color  !!! -->
  </button>
  <button class="tippy_icons" id="pbutton"> 
    <div class="tippy_circle" style="background-color:${cpink}"></div>
  </button>
    <button  class="tippy_icons" id="xbutton">
    <span style="font-size:2em;color:red;vertical-align:super">ø</span>
    </button>
    </div>
</div>
`;  

// Is user selecting text inside an input/textarea field?
function insideTextarea(){ // @sscalvo
  focusedElement = document.activeElement.tagName;
  return (focusedElement == "INPUT" || focusedElement == "TEXTAREA");
}

/*
We want to exit this function when: 
  - Popover is mounted (shown) 
  - Single clicks with 0-length selection
  - Selection happening on textboxes and textareas 
*/

function isSelected(event){
  console.log(event);
  console.log("el mouse up de isSelected: exit?" + !selecting);
  if (!selecting)
    return false;



  var elem = hoverElementOrSelection(); 
  console.log("---> Imprimiendo el elem");
  console.log(elem);
  // If user's selection contains/intersects a 'yawas-highlight' node, get current values to show popover coherently
  if (insideTextarea()){
    console.log("User dealing with highlights inside an INPUT or TEXTAREA: exiting!");
  }
  else if (elem) 
  {
    // elem.dataset.yawasColor = googleColors[color];
    // elem.style.backgroundColor = googleColors[color];
    // childrenToo(hoverElement,googleColors[color]);
    // updateHighlight(hoverElement,color,null);
    // clear the selection (on Firefox we selected the text inside oncontextmenu)
    // window.getSelection().removeAllRanges();
    console.log("Tippy launcher: editamos un highlight EXISTENTE");
    // elem.style.borderWidth = code2color[currentColor][0];
    // elem.style.borderColor = code2color[currentColor][1];
    // hoverElement = elem;
    // recolor(color);
  }
  else 
  {
    var wndWithSelection = getWindowWithSelection(window);
    yawas_tryHighlight(wndWithSelection); // lastHighlight should have been updated
    elem = lastHighlight;
  }  
 

}

document.addEventListener('mouseup', isSelected);

// This is for the floating box that shows counter 
function dragElement(div)
{
  let draggedDiv = div;
  let left = 0;
  let top = 0;
  draggedDiv.querySelector('#dragheader').addEventListener('mousedown',dragMouseDown);

  function dragMouseDown(e)
  {
      e.preventDefault();
      let rect = draggedDiv.getBoundingClientRect();
      left = e.clientX - rect.left;
      top = e.clientY - rect.top;
      document.addEventListener('mouseup',closeDragElement);
      document.addEventListener('mousemove',elementDrag);
  };

  function elementDrag(e)
  {
      e.preventDefault();
      let x = e.clientX;
      let y = e.clientY;
      draggedDiv.style.right = 'unset';
      draggedDiv.style.bottom = 'unset';
      let draggedWidth = draggedDiv.offsetWidth + 24;
      let draggedHeight = draggedDiv.offsetHeight + 8;
      let newleft = (x - left);
      let newtop = (y - top);
      if (newleft < 8)
          newleft = 8;
      if (newleft > window.innerWidth - draggedWidth)
          newleft = window.innerWidth - draggedWidth;
      if (newtop < 8)
          newtop = 8;
      if (newtop > window.innerHeight - draggedHeight)
          newtop = window.innerHeight - draggedHeight;
      draggedDiv.style.left = newleft + 'px';
      draggedDiv.style.top = newtop + 'px';
  };
  function closeDragElement(e)
  {
      document.removeEventListener('mouseup',closeDragElement);
      document.removeEventListener('mousemove',elementDrag);
  }
}

function contentScriptRequestCallback(request, sender, sendResponse) {
  //console.error('contentScriptRequestCallback',request);
  if (request.action)
  {
    if (request.action === 'signedin')
    {
      if (!signedin)
      {
        signedin = true; // this avoids loops: we declare we're signed first
        if (highlightswrapper)
        {
          setHighlightCaption('Yawas ➜ Refresh to view annotations');
          highlightswrapper.style.display = 'block';
        }
      }
    }
    else if (request.action === 'yawas_next_highlight')
      yawas_next_highlight();
    else if (request.action === 'yawas_chrome')
      yawas_chrome(request.color);
    else if (request.action === 'yawas_delete_highlight')
      yawas_delete_highlight();
  }
  if (sendResponse)
  {
    //console.log('sending response to background page');
    sendResponse({reponse:'ok'});
  }
  return true; // important in case we need sendResponse asynchronously
}

//chrome.runtime.onMessage.addListener(contentScriptRequestCallback);
chrome.runtime.onConnect.addListener((port) => {
  //console.log('onconnect to port',port);
  port.onMessage.addListener(contentScriptRequestCallback);
});

let charactersUsed = 0;
function setCharactersLeft(txt)
{
  charactersUsed = txt;
  if (highlightswrapper && highlightswrapper.querySelector('#charactersleft'))
    highlightswrapper.querySelector('#charactersleft').textContent = txt + '/2048 chars';

}
function setHighlightCaption(txt)
{
  if (highlightswrapper && highlightswrapper.querySelector('#highlightcaption'))
    highlightswrapper.querySelector('#highlightcaption').textContent = txt;
}

function showNotFound(evt)
{
  if (highlightsnotfoundtext.style.display === 'none')
  {
    var html = [];
    notRemapped.forEach(highlight => html.push(highlight.selection));
    highlightsnotfoundtext.innerHTML = `<div style='text-align:left;color:white'>${html.join('<br>')}</div>`;
    highlightsnotfoundtext.style.display = 'block';
  }
  else
    highlightsnotfoundtext.style.display = 'none';
}

function setHighlightsNotFound(array)
{
  if (highlightswrapper && highlightswrapper.querySelector('#highlightsnotfound'))
  {
    if (array.length > 0)
    {
      highlightswrapper.querySelector('#highlightsnotfound').textContent = array.length + ' missing';
    }
    else
      highlightswrapper.querySelector('#highlightsnotfound').textContent = '';
  }
}

function updateHighlightCaption() {
    if (highlightswrapper)
    {
      var nbNotRemapped = notRemapped.length;
      var nhighlights = document.getElementsByClassName('yawas-highlight').length;
      if (nhighlights > 0)
      {
        highlightswrapper.style.display = 'block';
        if (nhighlights > 1)
        {
          var current = currentHighlight + 1;
          setHighlightCaption(current + '/' + nhighlights + ' highlights');
        }
        else
        {
          setHighlightCaption(nhighlights + ' highlight');
        }
        setHighlightsNotFound(notRemapped);
      }
      else
      {
        highlightswrapper.style.display = 'none';
      }
    }

}

function purifyURL(href)
{
    if (href && href.indexOf('https://mail.google') === 0)
      return href;
    var url = href;
    var pos = url.indexOf('#');
    if (pos > 0)
        url = url.substring(0,pos);
    url = url.replace(/[?&]utm_.*/,'');
    url = url.replace(/[?&]WT\..*/,'');
    url = url.replace(/[?&]ns_.*/,'');
    url = url.replace(/[?&]rand=.*/,'');
    url = url.replace(/[?&]src=.*/,'');
    url = url.replace(/[?&]imm_mid=.*/,'');
    url = url.replace(/[?&]cmp=.*/,'');
    url = url.replace(/[?&]ncid=.*/,'');
    url = url.replace(/[?&]cps=.*/,'');
    url = url.replace(/[?&]mc_cid=.*/,'');
    url = url.replace(/[?&]mc_eid=.*/,'');
    url = url.replace(/[?&]mbid=.*/,'');
    if (url.indexOf('nytimes.com')!=-1)
        url = url.split('?')[0];
    //console.log('purifyURL=',href,'=',url);
    return url;
}

function yawas_getGoodUrl(doc)//,url)
{
    var url = null;
    if (doc && doc.location && doc.location.hostname.indexOf('readability.com') !== -1)
    {
        var origin = doc.querySelector('.entry-origin a');
        if (origin)
            url = origin.href;
    }
    if (!url)
        url = doc.location.href;

    if (url.indexOf("q=cache:") > 0)
    {
        try {
            return purifyURL(doc.getElementsByTagName('base')[0].href);
        } catch (e) {}
    }
    else
        return purifyURL(url);
}

function needSignIn()
{
  signedin = false;
  if (highlightswrapper)
  {
    setHighlightCaption('Signed out');
    highlightswrapper.style.display = 'block';
  }
}

function askForAnnotations(delay)
{
  var url = yawas_getGoodUrl(document);
  var additionalInfo = {
    "fn": "yawas_getAnnotations",
    "title": document.title,
    "url": url
  };
  if (!delay)
    delay = 0;
  setTimeout(function () {
    sendMessage(additionalInfo, function (res) {
      if (res.error)
      {
        if (res.signedout)
        {
          needSignIn();
          if (res.url)
          {
            //window.open(res.url);
            //console.log('res.url=',res.url);
          }
        }
      }
      else if (res.noannotation)
      {
        signedin = true;
        hoverElement = null;
        updateHighlightCaption();
      }
      else if (res.annotations)
      {
        signedin = true;
        hoverElement = null;
        setCharactersLeft(computeLength(res.annotations));
        yawas_remapAnnotations(res.annotations);
        updateHighlightCaption();
      }
    });
  }, delay);
}

function yawas_signin()
{
    var width = 400;
    var height = 360;
    var left = Math.floor( (screen.width - width) / 2);
    var top = Math.floor( (screen.height - height) / 2);
    window.open('https://www.google.com/accounts/ServiceLogin?service=toolbar&nui=1&hl=en&continue=http%3A%2F%2Ftoolbar.google.com%2Fcommand%3Fclose_browser','bkmk_popup','left='+left+',top='+top+',height='+height+'px,width='+width+'px,resizable=1');
}

function isSavingLocally(cb)
{
  chrome.storage.sync.get({saveLocally: false}, function(items) {
    if (items && items.saveLocally === true)
      cb(true);
    else
      cb(false);
  });
}

function yawas_undohighlight()
{
  if (lastHighlight !== null)
  {
    var f = document.createDocumentFragment();
    while(lastHighlight.firstChild)
      f.appendChild(lastHighlight.firstChild);
    lastHighlight.parentNode.replaceChild(f,lastHighlight);
    lastHighlight = null;
  }
}

// This is for the floating box that shows counter 
function addHighlightsWrapper()
{
  if (highlightswrapper === null)
  {
    highlightswrapper = document.createElement('div');
    highlightswrapper.id = 'yawas_highlightswrapper';
    highlightswrapper.style.userSelect = 'none';
    highlightswrapper.style.display = 'none';
    highlightswrapper.style.position = 'fixed';
    highlightswrapper.style.zIndex = 200000;
    highlightswrapper.style.margin = '0px';
    highlightswrapper.style.userSelect = 'none';
    highlightswrapper.style.fontFamily = '"avenir next",Helvetica';
    highlightswrapper.style.right = '8px';
    highlightswrapper.style.bottom = '8px';
    highlightswrapper.style.borderRadius = '0px';
    highlightswrapper.style.color = 'white';
    //highlightswrapper.style.boxShadow = '0 0 3px black';
    //highlightswrapper.addEventListener('click',yawas_next_highlight);
    highlightswrapper.textContent = '';
    highlightswrapper.style.textAlign = 'center';
    //highlightswrapper.style.cursor = 'pointer';

    highlightswrapper.style.fontSize = '14px';
    highlightswrapper.style.fontWeight = 'bold';
    highlightswrapper.style.color = 'black';
    highlightswrapper.style.backgroundColor = '#8a8';
    //highlightswrapper.style.borderRadius = '32px';
    highlightswrapper.style.padding = '8px 16px';
    //highlightswrapper.textContent = '';

    let dragheader = document.createElement('div');
    dragheader.id = 'dragheader';
    dragheader.style.textAlign = 'center';
    dragheader.style.cursor = 'move';
    dragheader.style.fontSize = '16px';
    dragheader.style.color = '#ccc';
    dragheader.textContent = 'Yawas';
    highlightswrapper.appendChild(dragheader);
    var highlightcaption = document.createElement('div');
    highlightcaption.addEventListener('click',yawas_next_highlight);
    highlightcaption.title = 'Click to navigate in highlights';
    highlightcaption.id = 'highlightcaption';
    highlightcaption.style.cursor = 'pointer';
    highlightcaption.textContent = '';
    highlightswrapper.appendChild(highlightcaption);

    var highlightsnotfound = document.createElement('div');
    highlightsnotfound.style.color = '#a22';
    highlightsnotfound.style.cursor = 'pointer';
    highlightsnotfound.addEventListener('click',showNotFound);
    highlightsnotfound.title = 'Click to show missing highlights';
    highlightsnotfound.id = 'highlightsnotfound';
    highlightswrapper.appendChild(highlightsnotfound);

    var highlightsnotfoundtext = document.createElement('div');
    highlightsnotfoundtext.style.color = '#a22';
    highlightsnotfoundtext.style.display = 'none';
    highlightsnotfoundtext.id = 'highlightsnotfoundtext';
    highlightswrapper.appendChild(highlightsnotfoundtext);

    var charactersleft = document.createElement('div');
    charactersleft.style.color = '#000';
    charactersleft.style.fontSize = '11px';
    charactersleft.style.cursor = 'pointer';
    charactersleft.title = 'Number of total characters used for this page in Google Bookmarks, out of 2048 possible';
    charactersleft.addEventListener('click',function () { alert(charactersUsed + ' characters used out of 2048 allowed by Google Bookmarks for this page')},false);
    charactersleft.style.display = 'block';
    charactersleft.id = 'charactersleft';
    highlightswrapper.appendChild(charactersleft);

    let close = document.createElement('div');
    close.textContent = '✕';
    close.style.position = 'absolute';
    close.style.top = 0;
    close.style.right = 0;
    close.style.fontSize = '12px'
    close.style.padding = '4px';
    close.style.color = '#ccc';
    close.style.cursor = 'pointer'
    close.addEventListener('click',function() { highlightswrapper.style.display ='none'},false);
    highlightswrapper.appendChild(close);
    document.body.appendChild(highlightswrapper);
    dragElement(highlightswrapper);
  }
}

function yawas_storeHighlight(webUrl,title,highlight,occurence,couleur,addcommentwhendone)
{

    var additionalInfo = {
        "fn": "addhighlight",
        "title": title,
        "url": webUrl,
        "selection": highlight,
        "occurence": occurence,
        "couleur": couleur //+ "twc"
    };


    sendMessage(additionalInfo, function (res)
    {
      if (res.addedhighlight)
      {
        signedin = true;
        setCharactersLeft(res.pureLen);
        updateHighlightCaption();
        if (addcommentwhendone)
        {
          hoverElement = lastHighlight;
          recolor('note');
        }
      }
      if (res.toobig)
      {
        yawas_undohighlight();
        alert('Too many characters (>2048 even compacted)!');
      }
      if (res.undohighlight || res.error)
      {
        if (res.signedout)
          alert('Yawas cannot store your highlight because you are signed out.\nPlease signin first and then refresh this page');
        yawas_undohighlight();
      }
    });
}

// Actual coloring happens here
function yawas_tryHighlight(wnd,addcommentwhendone)
{
    if (!wnd)
      return false;
    var nselections = wnd.getSelection().rangeCount;
    if (nselections === 0)
        return false;
    var selection = wnd.getSelection().getRangeAt(0);
    var selectionstring = wnd.getSelection()+"";//selection.toString();
    selectionstring = selectionstring.trim();
    if (selectionstring.length === 0)
        return false;
    // if (selectionstring.indexOf("\n") >= 0)  //TODO thinktwise: Also accept text with new lines
    // {
    //     alert("Please select text without new lines");
    //     return false;
    // }
    var docurl = yawas_getGoodUrl(wnd.document);
    var occurence = -1;
    wnd.getSelection().removeAllRanges();
    var found = false;
    while (!found && wnd.find(selectionstring,true,false))
    {
        occurence += 1;
        var rng = wnd.getSelection().getRangeAt(0);
        if (selection.compareBoundaryPoints(Range.END_TO_START, rng) == -1 && selection.compareBoundaryPoints(Range.START_TO_END, rng) == 1)
            found = true;
    }
    if (!found)
        occurence = -1;
    if (occurence >= 0)
    {
      console.log("Tippy launcher: creamos un NUEVO highlight y el default pre-highligth es " + currentColor);
        lastHighlight = highlightNowFirefox22(wnd.getSelection().getRangeAt(0),currentColor,forecolor,wnd.document,selectionstring,occurence);
        wnd.getSelection().removeAllRanges();

        yawas_storeHighlight(docurl,wnd.document.title,selectionstring,occurence,currentColor,addcommentwhendone);
        return true;
    }
    else
    {
        // alert('Sorry, [' + selectionstring + '] was not found.');
        console.log('Sorry, [' + selectionstring + '] was not found.');
        wnd.getSelection().removeAllRanges();
        return false;
    }
}

function getWindowWithSelection(wnd)
{
    //alert('hasSelection:' + wnd);
    if (wnd.getSelection().rangeCount>0)
    {
        //alert('found selection:' + wnd.getSelection());
        return wnd;
    }
    else
        return null;
}

// See below for recolor version of thinktwise @sscalvo
function recolor(color)
{
  if (color === 'note')
  {
    let caption = hoverElement.dataset.comment!==null?hoverElement.dataset.comment:'';
    let newcomment = prompt('Enter note',caption);
    if (newcomment !== null)
    {
      newcomment = newcomment.trim();
      if (newcomment.length === 0)
      {
        //hoverElement.style.borderBottom = 0;
        //delete hoverElement.dataset.yawasComment;
        delete hoverElement.dataset.comment;
        delete hoverElement.title;
      }
      else
      {
        //hoverElement.style.borderBottom = '1px dashed black';
        //hoverElement.dataset.yawasComment = newcomment;
        hoverElement.dataset.comment = newcomment;
        hoverElement.title = newcomment;
      }
      updateHighlight(hoverElement,color,newcomment);
      hoverElement = null;
    }
    return;
  }
  else
  {
    hoverElement.dataset.yawasColor = googleColors[color];
    hoverElement.style.backgroundColor = googleColors[color];
    childrenToo(hoverElement,googleColors[color]);
    updateHighlight(hoverElement,color,null);
    // clear the selection (on Firefox we selected the text inside oncontextmenu)
    window.getSelection().removeAllRanges();
  }
}

// function recolor_thinktwise(color)
// {
//   update_elem_style( hoverElement ) ;
//   // hoverElement.style.borderWidth = code2color[color][0];
//   // hoverElement.style.borderColor = code2color[color][1];
//   // childrenToo(hoverElement,googleColors[color]);
//   updateHighlight(hoverElement,color,null);
//   // clear the selection (on Firefox we selected the text inside oncontextmenu)
//   window.getSelection().removeAllRanges();
// }

// from http://stackoverflow.com/questions/1482832/how-to-get-all-elements-that-are-highlighted/1483487#1483487
function rangeIntersectsNode(range, node) {
    var nodeRange;
    if (range.intersectsNode) {
        return range.intersectsNode(node);
    } else {
        nodeRange = node.ownerDocument.createRange();
        try {
            nodeRange.selectNode(node);
        } catch (e) {
            nodeRange.selectNodeContents(node);
        }

        return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) == -1 &&
        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) == 1;
    }
}

function sendMessage(info,cb)
{
  try {
    chrome.runtime.sendMessage(info, function response(res) {
      if (cb)
        cb(res);
    });
  } catch(e)
  {
    if (cb)
      cb({error:e});
    else
      console.error('sendMessage error' + e);
  }
}
/*
// see below yawas_chrome_thinktwise for thinktwise version @sscalvo
function yawas_chrome(color)
{
    if (color === 'email')
    {
        var info = {
            "title": document.title,
            "url": window.location.href,
            "fn": "emailhighlights",
        };
        sendMessage(info);
        return;
    }
    if (color === 'copytoclipboard')
    {
        var info = {
            "title": document.title,
            "url": window.location.href,
            "fn": "copytoclipboard",
        };
        sendMessage(info);
        return;
    }

    if (color && color !== 'note')
    {
        currentColor = color;
    }
    else
    {
        //currentColor = 'yellow';
    }

    var elem = hoverElementOrSelection();
    if (elem)
    {
      hoverElement = elem;
      recolor(color);
    }
    else
    {
      var wndWithSelection = getWindowWithSelection(window);
      if (color === 'note')
        yawas_tryHighlight(wndWithSelection,true);
      else
        yawas_tryHighlight(wndWithSelection);
    }
}
*/

function get_color ( elem, index )
{
 return (elem.dataset.yawasColor >> (index*2)) & 0x3 ;
}


function set_color ( elem, index, value )
{
  const mask = ~( 0x3 << ( index * 2 ) ) ;

  elem.dataset.yawasColor &= mask ;
  elem.dataset.yawasColor |= ( value << ( index * 2 ) ) ;
}

function update_elem_style ( elem )
{
  const border_width = ( index ) => get_color( elem, index ) === 0 ? "1px" : "2px" ;
  const border_color = ( index ) =>
  {
    const code = get_color( elem, index ) ;

    return code === 0 ? "lightGray"
         : code === 1 ? code_to_color[ index ]
         :              cblack ;
  }

  elem.style.borderWidth = [0,1,2,3].map( border_width ).join( " " ) ;
  elem.style.borderColor = [0,1,2,3].map( border_color ).join( " " ) ;
}

function yawas_chrome_thinktwise(color_index, elem, negated)
{
  const current_color = get_color( elem, color_index ) ;
  const code          = (negated ? 3 : 1) ;
  const new_color     = current_color === 0          ? code
                      : current_color < 3 && negated ? code
                      :                                   0 ;

  set_color( elem, color_index, new_color ) ;
  update_elem_style( elem ) ;
  hoverElement = elem ;
  updateHighlight( elem, elem.dataset.yawasColor, null ) ;

  // var elem = hoverElementOrSelection();
  // recolor_thinktwise( elem.dataset.yawasColor ) ; // updates on the db/storage
  // clear the selection (on Firefox we selected the text inside oncontextmenu)
  window.getSelection().removeAllRanges();
}



function yawas_remapAnnotations(highlights)
{
  return highlightDoc(window,document,highlights);
}

function yawas_uncompact(wnd,highlights)
{
	for (var i=0;i<highlights.length;i++)
	{
		//console.log(i,highlights[i].selection,highlights[i].n)
		var sel = highlights[i].selection;
		var chk = sel.split('~~');
		if (chk.length === 2 && chk[1].length === 16)
		{
			wnd.getSelection().removeAllRanges();
			var len = parseInt(chk[0]);
			var first = chk[1].substring(0,8);
			var second = chk[1].substring(8,16);
			//console.log(len,first,second);
			if (wnd.find(first,true,false))
			{
				var s = wnd.getSelection();
				//console.log('found',first);
				var anchor = s.anchorNode;
				var offsetstart = s.anchorOffset;
				//console.log('offset1=',offsetstart);
				if (wnd.find(second,true,false))
				{
					//console.log('found second',second);
					s = wnd.getSelection();
					if (anchor === s.focusNode)
					{
						//console.log('same anchorNode');
						var offsetend = s.focusOffset; // end of match
						//console.log('focusoffset=',offsetend);
						if (offsetend - offsetstart === len)
						{
							var content = s.anchorNode.textContent.replace(/\s/g,' ');
							highlights[i].selection_unpacted = content.substring(offsetstart,offsetend);
							//console.log('setting highlights[',i,']=',highlights[i].selection_unpacted);
						}
						//else
						//	console.error('len not right',offsetend - offsetstart);
					}
					else
					{
						//console.error('not same anchorNode');
						var offsetend = s.focusOffset + anchor.textContent.length;
						if (offsetend - offsetstart === len)
						{
							var content = anchor.textContent.replace(/\s/g,' ') + s.focusNode.textContent.replace(/\s/g,' ');
							highlights[i].selection_unpacted = content.substring(offsetstart,offsetend);
							//console.log('setting highlights[',i,']=',highlights[i].selection_unpacted);
						}
					}
				}
			}
			else
			{
				//console.error('compacted highlight not found',highlights[i].selection);
			}
		}
	}
}

function highlightDoc(wnd,doc,highlights)
{
    let previousRange = null;
    if (wnd.getSelection().rangeCount > 0)
      previousRange = wnd.getSelection().getRangeAt(0);
    var scrollLeft = wnd.scrollX;
    var scrollTop = wnd.scrollY;
    nremapped = 0;
    notRemapped = [];
    yawas_uncompact(wnd,highlights);
    for (var i=0;i<highlights.length;i++)
    {
        wnd.getSelection().removeAllRanges();
        var selectionString = highlights[i].selection;
        if (highlights[i].selection_unpacted)
        	selectionString = highlights[i].selection_unpacted;
        var n = 0;
        while (n<highlights[i].n && wnd.find(selectionString,true,false))
        {
            n++;
        }
        if (n == highlights[i].n && wnd.find(selectionString,true,false))
        {
          try {
            highlightNowFirefox22(wnd.getSelection().getRangeAt(0), highlights[i].color, forecolor, doc, highlights[i].selection, highlights[i].n,highlights[i].comment);
            nremapped++;
          }
          catch(e){
            console.error('error highlightNowFirefox22',e);
          }
        }
        else
          notRemapped.push(highlights[i]);
    }
    wnd.getSelection().removeAllRanges();
    wnd.scrollTo(scrollLeft,scrollTop);
    if (previousRange)
      wnd.getSelection().addRange(previousRange);
    return nremapped;
}

function twWheel(node, color){

  node.style.border="solid"
  node.style.borderWidth = "thin medium thin medium"
  node.style.borderRadius = "25px"
}

function highlightNowFirefox22(selectionrng,color,textcolor,doc, selectionstring,occurence,comment)
{
    let baseNode = doc.createElement("yawas");//span was changing styling on some web pages
    baseNode.className = 'yawas-highlight';
    // baseNode.style.backgroundColor = googleColors[color]; // @sscalvo 
    // baseNode.addEventListener("mouseenter", function( event ) {console.log("hoveringgg: Llamar a la funcion que muestra tippy");   });

    if (comment && comment > '')
    {
      baseNode.dataset.comment = comment;
      //baseNode.dataset.yawasComment = comment;
      baseNode.title = comment;
      //baseNode.style.borderBottom = '1px dashed black';
    }
    baseNode.dataset.selection = selectionstring;
    baseNode.dataset.yawasOccurence = occurence;
    // baseNode.dataset.yawasColor = googleColors[color];
    baseNode.dataset.yawasColor = color;

    // @sscalvo added
    baseNode.style.border="solid";
    baseNode.style.borderRadius = "25px"
    update_elem_style( baseNode ) ;

    // let node = yawas_highlight222(selectionrng, baseNode, googleColors[color]);
    let node = yawas_highlight222(selectionrng, baseNode, color);

    node.addEventListener('mouseover',function (e) {
      hoverElement = this;
      // console.log("MOSTRAR tippy ahora");
      // https://stackoverflow.com/questions/3103962/converting-html-string-into-dom-elements
      var tmp_doc = new DOMParser().parseFromString(tippy_content, "text/html");
      var tippy_doc = tmp_doc.body.firstChild;
      
      tippy(node, {
        content: tippy_doc,
        interactive: true,
        arrow: true,
        allowHTML: true,
        hideOnClick: false, 
        theme: 'light-border',
        placement: 'top-end',
        onHide(){          console.log("tippy onHide");  selecting=true;       },
        onHidden(){        console.log("tippy onHidden"); selecting=true;        },
        onShown(){         console.log("tippy onShown");         },
        onShow(){          console.log("tippy onShow");         },
        onMount(){
          el_this = this;
          console.log("tippy onMount");
          selecting = false;
          // This buttons only exist in the DOM after tippy onMount has been triggered
          gbutton = document.getElementById("gbutton") ;
          pbutton = document.getElementById("pbutton") ;
          bbutton = document.getElementById("bbutton") ;
          obutton = document.getElementById("obutton") ;
          xbutton = document.getElementById("xbutton") ;

          const setColor = function ( color, negated ){
            return function ( ) { 
              button_clicked=true;
              console.log("La funcion: button_clicked " + button_clicked + " el color es " + color)
              yawas_chrome_thinktwise(color,node, negated); 
              hoverElement = null;
            }
          }


          gbutton.addEventListener( 'click', setColor( 0 ) ) ; //yellow
          pbutton.addEventListener( 'click', setColor( 1 ) ) ; //red
          bbutton.addEventListener( 'click', setColor( 2 ) ) ; //blue
          obutton.addEventListener( 'click', setColor( 3 ) ) ; //green
          xbutton.addEventListener( 'click', function(){thinktwise_delete_highlight(node); hoverElement = null; node._tippy.hide();}); //deletes the comment and hides popover
          
          gbutton.addEventListener('dblclick', setColor( 0, true) ) ;
          pbutton.addEventListener('dblclick', setColor( 1, true) ) ;          
          bbutton.addEventListener('dblclick', setColor( 2, true) ) ;
          obutton.addEventListener('dblclick', setColor( 3, true) ) ;
          
          // bbutton = document.getElementById("bbutton").onmouseup=function(){ console.log("XXX mouseup") }; //borrar

        }
      });




    },false);
    
    node.addEventListener('mouseout',function (e) {
      hoverElement = null;
      console.log("OCULTAR tippy ahora");
    },false);

    return node;
}

// on Firefox, we need to select the text before showing the context menu
// on Chrome, somehow the current word is selected when the user right clicks over words
window.oncontextmenu = function () {
  if (!insideTextarea()) // @sscalvo
  {
    console.log("window on context menu");
    if (hoverElement !== null)
    {
      let selection = window.getSelection();
      if (selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
      let range = document.createRange();
      range.selectNode(hoverElement);
      selection.addRange(range);
    }
  }
}

function childrenToo(docfrag,backgroundColor)
{
    docfrag.childNodes.forEach(f => {if (f.style){f.style.backgroundColor = backgroundColor}});
}

function yawas_highlight222(range, node,backgroundColor)
{
    var startContainer = range.startContainer;
    var startOffset = range.startOffset;
    var endOffset = range.endOffset;
    var docfrag = range.extractContents();
    // childrenToo(docfrag,backgroundColor);
    var before = startContainer.splitText(startOffset);
    var parent = before.parentNode;
    node.appendChild(docfrag);
    parent.insertBefore(node, before);
    return node;
}

function updateHighlight(elt,color,newcomment)
{
  
  if (elt)
  {
    if (button_clicked != false){
      currentColor = color; //@sscalvo for default color
      console.log("currentColor: " + currentColor + " button_clicked:" + button_clicked);
      button_clicked=false;

    }

        sendMessage( { action: "recolor_highlight"
                     , url: yawas_getGoodUrl(document)
                     , title: document.title
                     , highlightString: elt.dataset.selection
                     , n: elt.dataset.yawasOccurence
                     , newcolor: color
                     , comment:newcomment
                     }
                   , function (res){
          if (res.error)
          {
            //console.error(res);
            yawas_undohighlight();
            if (res.toobig)
              alert('Too many characters (>2048 even compacted)!');
          }
          else
          {
            if (res && res.highlights)
              setCharactersLeft(computeLength(res.highlights));
          }
        });
    }
}

function hoverElementOrSelection() {
  if (hoverElement !== null)
    return hoverElement;
  var wndWithSelection = getWindowWithSelection(window);
  if (!wndWithSelection)
    return null;
  let rng = wndWithSelection.getSelection().getRangeAt(0);
  let elems = document.querySelectorAll('.yawas-highlight');

  for (let i=0;i<elems.length;i++)
  {
    if (rangeIntersectsNode(rng,elems[i].firstChild))
      return elems[i];
  }
  return null;
}

function computeLength(highlights)
{
    var annotation = '';
    for (var i=0;i<highlights.length;i++)
    {
      if (highlights[i].comment)
        annotation += highlights[i].comment;
      annotation += leftMark + highlights[i].selection;
      if (highlights[i].p)
        annotation += '@' + highlights[i].n + ',' + highlights[i].p;
      else if (highlights[i].n > 0)
          annotation += '@' + highlights[i].n;
      if (highlights[i].color != 'yellow')
          annotation += '#' + highlights[i].color;
      annotation += rightMark + ' ';
    }
    return annotation.length;
}

function yawas_delete_highlight() {
  let elem = hoverElementOrSelection();
  if (elem)
  {
    sendMessage({action: "delete_highlight", url: yawas_getGoodUrl(document), title: document.title, highlightString: elem.dataset.selection, n:elem.dataset.yawasOccurence }, function (res)
    {
      if (res && res.highlights)
        setCharactersLeft(computeLength(res.highlights));
    });
    childrenToo(elem,null);
    var f = document.createDocumentFragment();
    while(elem.firstChild)
        f.appendChild(elem.firstChild);
    elem.parentNode.replaceChild(f,elem);
    hoverElement = null;
    updateHighlightCaption();
  }
}


function thinktwise_delete_highlight(elem) {
  // let elem = hoverElementOrSelection();
  if (elem)
  {
    sendMessage({action: "delete_highlight", url: yawas_getGoodUrl(document), title: document.title, highlightString: elem.dataset.selection, n:elem.dataset.yawasOccurence }, function (res)
    {
      if (res && res.highlights)
        setCharactersLeft(computeLength(res.highlights));
    });
    childrenToo(elem,null);
    var f = document.createDocumentFragment();
    while(elem.firstChild)
        f.appendChild(elem.firstChild);
    elem.parentNode.replaceChild(f,elem);
    hoverElement = null;
    updateHighlightCaption();
  }
}




/*function editLocally()
{
  var docurl = yawas_getGoodUrl(document);
  var editPageURL = chrome.extension.getURL('localedit.html?url=' + docurl);
  alert(editPageURL);
  var a = window;
  a.open(editPageURL, "bkmk_popup", "left="+((a.screenX||a.screenLeft)+10)+",top="+((a.screenY||a.screenTop)+10)+",height=420px,width=550px,resizable=1,alwaysRaised=1");
}

function yawas_chrome_edit()
{
  isSavingLocally(function (res) {
    if (res === true)
    {
      return editLocally();
    }
    if (window.top !== window)
      return;
    try {
        var doc = document;
        var docurl = yawas_getGoodUrl(doc);
        var url = encodeURIComponent(docurl);
        var title = encodeURIComponent(doc.title);
        var a=window;
        a.open("https://www.google.com/bookmarks/mark?op=edit&output=popup&bkmk=" + url + "&title="  + title, "bkmk_popup", "left="+((a.screenX||a.screenLeft)+10)+",top="+((a.screenY||a.screenTop)+10)+",height=420px,width=550px,resizable=1,alwaysRaised=1");
    } catch (e) { console.error('edit error:' + e); }
  });
}*/

var currentHighlight = 0;

/*function showDonateButton()
{
    var donatewrapper = document.createElement('div');
    donatewrapper.style.position = 'fixed';
    donatewrapper.style.zIndex = 200000;
    donatewrapper.style.margin = '0px';
    donatewrapper.style.padding = '16px';
    donatewrapper.style.backgroundColor = '#190B33';
    donatewrapper.style.fontSize = '13pt';
    donatewrapper.style.fontFamily = '"avenir next",Helvetica';
    donatewrapper.style.right = '8px';
    donatewrapper.style.top = '8px';
    donatewrapper.style.borderRadius = '0px';
    donatewrapper.style.color = 'white';
    donatewrapper.style.boxShadow = '0 0 3px black';
    donatewrapper.style.transform = 'translateY(-400px)';
    donatewrapper.style.opacity = 0;
    donatewrapper.style.transition = 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out';

    donatewrapper.innerHTML = '<span style="color:white;margin:16px;padding:16px">Please support Yawas<span>';
    var donate = document.createElement('button');
    donate.addEventListener('click',function () {
      donatewrapper.style.opacity = 0;
      setTimeout(function () {
        donatewrapper.parentElement.removeChild(donatewrapper);
      },400);
      chrome.storage.sync.set({
          showdonate: false,
        }, function() {
      });
      sendMessage({'fn':'yawas_donate'});
    });
    donate.textContent = 'Donate';
    donate.style.backgroundColor = 'rgb(255, 196, 57)';
    donate.style.color = 'black';
    donate.style.display = 'block';
    donate.style.marginLeft = 'auto';
    donate.style.marginRight = 'auto';
    donate.style.padding = '8px 16px';
    donate.style.marginTop = '16px';
    donate.style.borderRadius = '32px';
    donate.setAttribute('title','Donate to support Yawas');
    donate.style.cursor = 'pointer';
    donate.style.border = 0;
    donate.style.boxShadow = '0 0 3px black';
    donate.style.fontSize = '13px';
    donate.style.fontWeight = 'bold';
    donate.addEventListener('mouseover',function () {this.style.color='white';});
    donate.addEventListener('mouseout',function () {this.style.color='black';});

    var close = document.createElement('button');
    close.addEventListener('click',function () {
      donatewrapper.style.opacity = 0;
      donatewrapper.style.transform = 'translateY(-400px)';
      setTimeout(function () {
        donatewrapper.parentElement.removeChild(donatewrapper);
      },400);
      chrome.storage.sync.set({
        showdonate: false,
      }, function() {
      });
      //alert('You can always DONATE later (click the Yawas star icon)');
    });
    close.style.position = 'absolute';
    close.style.left = '4px';
    close.style.top = '4px';
    close.addEventListener('mouseover',function () {this.style.color='gray';});
    close.addEventListener('mouseout',function () {this.style.color='white';});
    close.style.backgroundColor = 'transparent';
    close.setAttribute('title','Close');
    close.style.borderShadow = null;
    close.style.boxShadow = '0 0 0px black';
    close.style.cursor = 'pointer';
    close.style.color = 'white';
    close.style.display = 'block';
    close.style.fontWeight = 'bold';
    close.style.fontSize = '12px';
    close.style.textAlign = 'center';
    close.style.border = 0;
    close.style.outline = 'none';
    close.textContent = '✕';
    donatewrapper.appendChild(donate);
    donatewrapper.appendChild(close);
    document.body.appendChild(donatewrapper);
    setTimeout(function () { donatewrapper.style.opacity = 1; donatewrapper.style.transform = 'translateY(0)';},2000);
}*/

function addStyle(doc,css)
{
  var style = document.createElement('style');
  style.innerHTML = css;
  doc.head.appendChild(style);
}

function yawas_next_highlight()
{
  if (!signedin)
    return yawas_signin();

    var highlights = document.getElementsByClassName('yawas-highlight');
    if (highlights.length==0)
        return;
    currentHighlight = currentHighlight % highlights.length;
    updateHighlightCaption();
    let h = highlights[currentHighlight];
    h.style.transition = 'opacity 0.3s ease-in-out';
    h.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
    h.style.opacity = 0.2;
    currentHighlight += 1;
    setTimeout(function () { h.style.opacity=1.0; }, 300);
}

//console.log('here');

window.onhashchange = function (evt) {
  askForAnnotations(2000);
};

if (document.location.hostname === 'toolbar.google.com' && document.location.pathname === '/command' && document.location.search && document.location.search.indexOf('close_browser') !== -1)
{
    window.close();
    sendMessage({fn: "yawas_toolbar_signed_in"});
}
else if (document.location.href.indexOf('accounts.google.com/ServiceLogin') != -1)
{
    //console.error('not asking getannotations for servicelogin window');
}
else
{
    //window.addEventListener("keydown", keyListener, false);
    if (window.top !== window)
    {
        //console.error('cookkie_handler not calling getannotations because not top window');
    }
    else
    {
        //addScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.0.272/jspdf.debug.js");
        addHighlightsWrapper();
        addStyle(window.document,'.yawas-highlight:hover{opacity:0.6;}.yawas-highlight[data-comment]{border-bottom:1px dashed black}');
        askForAnnotations(2000);
        /*setTimeout(function () {
          var documentClone = document.cloneNode(true);
          var article = new Readability(documentClone).parse();
          //console.log(article.content);
          if (article && article.content)
          {
            let div = document.createElement('div');
            div.innerHTML = article.content;
            document.body.appendChild(div);
            var pdf = new jsPDF('p', 'pt', 'letter');
            pdf.html(div,{callback: function (pdf) {
              pdf.save('test.pdf');
              div.parentElement.removeChild(div);
            }});
          }
        },4000);*/
    }
    var elems = document.querySelectorAll('*');
    for (var i=0;i<elems.length;i++)
    {
        if (elems[i].style)
        {
            elems[i].style.userSelect='text';
            //elems[i].style.webkitUserSelect='text';
        }
    }
}
