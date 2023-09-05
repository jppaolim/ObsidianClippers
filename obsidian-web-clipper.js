javascript: (async () => {
    const [{ default: Turndown }, readabilityModule] = await Promise.all([
        import('https://unpkg.com/turndown?module'),
        import('https://cdn.skypack.dev/@mozilla/readability')
    ]);

    const Readability = readabilityModule.Readability;


  /* Optional vault name */
  const vault = "Main";

  /* Optional folder name such as "Clippings/" */
  const folder = "Ressources/";

  /* Optional tags */
  var tagLines = ['tags:'];
  tagLines.push('  - AI');  // The initial "AI" tag

  /* Parse the site's meta keywords content into tags, if present --> from experience it's not so interesting so commenting it*/
  if (document.querySelector('meta[name="keywords" i]')) {
    var keywords = document.querySelector('meta[name="keywords" i]').getAttribute('content').split(',');

    keywords.forEach(function(keyword) {
      let tag = keyword.trim();  // Remove extra spaces from each keyword
      //tagLines.push('  - ' + tag);  // Add each keyword as a new list item
    });
  }

  const tagsYAML = tagLines.join('\n');  // Join each line into a single string

  function getSelectionHtml() {
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return html;
  }

  const selection = getSelectionHtml();

  const {
      title,
      byline,
      content
  } = new Readability(document.cloneNode(true)).parse();

  function sanitizeYAMLstring(str) {
    return str.replace(/["'“”‘’]/g, '');
  }
  const sanitizedTitle = sanitizeYAMLstring(title);


  function getFileName(fileName) {
    const invalidChars = /[:/\\?%*|"<>]/g;
   
   fileName = fileName.replace(invalidChars, ' - ');
   fileName = fileName.replace(/\s+/g, ' ').trim();
   
   return fileName;
 }
 
 function fixMarkdownLinks(text) {
    const regex = /\[\s*\n*!\[\](?:\()([^\)]+)(?:\))\s*\n*\]\(([^)]+)\)/g;
    return text.replace(regex, "[![]($1)]($2)");
  }
 
  const fileName = getFileName(sanitizedTitle);

  if (selection) {
      var markdownify = selection;
  } else {
      var markdownify = content;
  }

  if (vault) {
      var vaultName = '&vault=' + encodeURIComponent(`${vault}`);
  } else {
      var vaultName = '';
  }

  const markdownBodyTemp = new Turndown({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
  }).turndown(markdownify);

  const markdownBody = fixMarkdownLinks(markdownBodyTemp);

  var date = new Date();

  function convertDate(date) {
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();
    var mmChars = mm.split('');
    var ddChars = dd.split('');
    return yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);
  }

  const today = convertDate(date);

  // Utility function to get meta content by name or property
  function getMetaContent(attr, value) {
      var element = document.querySelector(`meta[${attr}='${value}']`);
      return element ? element.getAttribute("content").trim() : "";
  }

  // Fetch byline, meta author, property author, or site name
  var author = byline || getMetaContent("name", "author") || getMetaContent("property", "author") || getMetaContent("property", "og:site_name");

  // Check if there's an author and add brackets
  var authorBrackets = author ? `"[[${author}]]"` : "";

  // Get descriptino 
  var desc = getMetaContent("name", "description") || getMetaContent("property", "description") ||  getMetaContent("property", "og:description"); ; 
  const sanitizedDesc = sanitizeYAMLstring(desc)

  /* YAML front matter as tags render cleaner with special chars  */
  const fileContent = 
      '---\n'
      + 'category: "[[Clippings]]"\n'
      + 'author: ' + authorBrackets + '\n'
      + 'title: "' + sanitizedTitle + '"\n'
      + 'source: ' + document.URL + '\n'
      + 'clipped: ' + today + '\n'
      + 'description: "' + sanitizedDesc + '"\n'
      + 'summary: "' + '"\n'
      + tagsYAML + '\n'  // Include the tags in the new format
      + "publish: false\n"
      + '---\n\n'
      + "# "+ title +'"\n'
      + markdownBody ;

   document.location.href = "obsidian://new?"
    + "file=" + encodeURIComponent(folder + fileName)
    + "&content=" + encodeURIComponent(fileContent)
    + vaultName ;

})();




  