javascript: (async () => {
    const [{ default: Turndown }, readabilityModule] = await Promise.all([
        import('https://unpkg.com/turndown?module'),
        import('https://cdn.skypack.dev/@mozilla/readability')
    ]);

    const Readability = readabilityModule.Readability;

    // UUID Generation function
    function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    }

    // Function to extract and parse publication date
    function getPublicationDate() {
        // Try different meta tags that might contain the publication date
        const dateSelectors = [
            'meta[property="article:published_time"]',
            'meta[name="publication-date"]',
            'meta[name="date"]',
            'meta[property="og:published_time"]',
            'time[datetime]',
            'meta[name="publish-date"]'
        ];

        for (const selector of dateSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const dateStr = element.getAttribute('content') || element.getAttribute('datetime');
                if (dateStr) {
                    try {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                            return convertDate(date);
                        }
                    } catch (e) {
                        console.log('Error parsing date:', e);
                    }
                }
            }
        }

    // Return today's date if no publication date found
    return convertDate(new Date());
}

  /* Optional vault name */
  const vault = "Main";

  /* Optional folder name such as "Clippings/" */
  const folder = "References/Capture/";

  /* Optional tags */
  var tagLines = ['tags:'];
  tagLines.push('  - AI');  // The initial "AI" tag
  tagLines.push('  - active');  // The initial "AI" tag

  /* Parse the site's meta keywords content into tags, if present --> from experience it's not so interesting so commenting*/
  if (document.querySelector('meta[name="keywords" i]')) {
    var keywords = document.querySelector('meta[name="keywords" i]').getAttribute('content').split(',');

    keywords.forEach(function(keyword) {
      let tag = keyword.trim();  
      //tagLines.push('  - ' + tag);  // Add each keyword as a new list item uncomment if you want to capture them.
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
 

  // Modified to include date in filename
  const sanitizedTitleForFile = getFileName(sanitizedTitle);
  const today = convertDate(new Date());
  const fileName = `${today}-${sanitizedTitleForFile}`;


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

  function convertDate(date) {
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth() + 1).toString();
    var dd = date.getDate().toString();
    var mmChars = mm.split('');
    var ddChars = dd.split('');
    return yyyy + '-' + (mmChars[1] ? mm : "0" + mmChars[0]) + '-' + (ddChars[1] ? dd : "0" + ddChars[0]);
}

    const publicationDate = getPublicationDate();


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

  /* YAML front matter as tags render cleaner with special chars */
  const fileContent =
  '---\n' +
  'id: "' + generateUUID() + '"\n' +
  'title: "' + sanitizedTitle + '"\n' +
  'author: ' + authorBrackets + '\n' +
  tagsYAML + '\n' +
  'created_date: ' + today + '\n' +
  'modified_date: ' + today + '\n' +
  'source: ' + document.URL + '\n' +
  'source_date: ' + publicationDate + '\n' +
  'source_title: "' + sanitizedTitle + '"\n' +
  'source_description: "' + sanitizedDesc + '"\n' +
  '---\n\n' +
  "# " + sanitizedTitle + '\n' +
  markdownBody;
  
   document.location.href = "obsidian://new?"
    + "file=" + encodeURIComponent(folder + fileName)
    + "&content=" + encodeURIComponent(fileContent)
    + vaultName ;

})();