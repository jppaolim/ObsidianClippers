javascript: (async () => {
  const [{ default: Turndown }, readabilityModule] = await Promise.all([
    import("https://unpkg.com/turndown?module"),
    import("https://cdn.skypack.dev/@mozilla/readability"),
  ]);
  const Readability = readabilityModule.Readability;

  // Enhanced HTML cleanup before processing
  function cleanupHTML(html) {
    const div = document.createElement("div");
    div.innerHTML = html;

    // Remove unwanted elements
    const selectorsToRemove = [
      "script",
      "style",
      "iframe",
      "nav",
      "footer",
      ".advertisement",
      ".social-share",
      ".comments",
      '[role="complementary"]',
      ".sidebar",
    ];
    div
      .querySelectorAll(selectorsToRemove.join(","))
      .forEach((el) => el.remove());

    // Fix relative URLs
    const baseURL = new URL(document.URL);
    div.querySelectorAll("a[href], img[src]").forEach((el) => {
      const attr = el.tagName === "A" ? "href" : "src";
      try {
        el[attr] = new URL(el[attr], baseURL).href;
      } catch (e) {
        console.error(`Error processing ${attr} URL:`, e);
      }
    });

    return div.innerHTML;
  }

  // Enhanced Turndown configuration
  function createTurndownService() {
    const service = new Turndown({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
    });

    // Preserve HTML tables
    service.keep(["table", "tr", "td", "th", "thead", "tbody"]);

    // Better handling of code blocks
    service.addRule("fencedCodeBlock", {
      filter: ["pre", "code"],
      replacement: function (content, node) {
        let className = node.getAttribute("class") || "";
        let languageMatch = className.match(/language-(\S+)/);
        let language = languageMatch ? languageMatch[1] : "";
        return "\n\`\`\`" + language + "\n" + content.trim() + "\n\`\`\`\n";
      },
    });

    // Preserve line breaks in lists and paragraphs
    service.addRule("lineBreaks", {
      filter: ["br"],
      replacement: function () {
        return "  \n";
      },
    });

    // Better handling of blockquotes
    service.addRule("blockquotes", {
      filter: "blockquote",
      replacement: function (content) {
        content = content.replace(/^\n+|\n+$/g, "");
        content = content.replace(/^/gm, "> ");
        return "\n\n" + content + "\n\n";
      },
    });

    // Ensure Turndown processes images correctly
    service.addRule("images", {
      filter: "img",
      replacement: function (content, node) {
        const alt = node.alt || "";
        const src = node.getAttribute("src");
        if (!src) return "";
        const title = node.title || "";
        const titlePart = title ? ` "${title}"` : "";
        return `![${alt}](${src}${titlePart})`;
      },
    });

    return service;
  }

  // UUID Generation function
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // Function to extract and parse publication date
  function getPublicationDate() {
    // Try different meta tags that might contain the publication date
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="publication-date"]',
      'meta[name="date"]',
      'meta[property="og:published_time"]',
      "time[datetime]",
      'meta[name="publish-date"]',
    ];

    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const dateStr =
          element.getAttribute("content") || element.getAttribute("datetime");
        if (dateStr) {
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return convertDate(date);
            }
          } catch (e) {
            console.log("Error parsing date:", e);
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

  /* Function to generate tags based on mode */
  function generateTags(isMetadataOnly) {
    const tagLines = ["tags:"];
    tagLines.push("  - AI"); // The initial "AI" tag

    // Add 'link' tag for metadata-only mode
    if (isMetadataOnly) {
      tagLines.push("  - link");
    }

    return tagLines.join("\n");
  }

  // Enhanced selection capture
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
    return cleanupHTML(html); // Clean the HTML before processing
  }

  // Enhanced Readability options
  const readabilityOptions = {
    charThreshold: 60,
    classesToPreserve: ["code", "pre", "table"],
  };

  const docClone = document.cloneNode(true);
  const { title, byline, content } = new Readability(
    docClone,
    readabilityOptions
  ).parse();

  function sanitizeYAMLstring(str) {
    return str.replace(/["'“”‘’]/g, "").replace(/[:\n]/g, " ");
  }
  const sanitizedTitle = sanitizeYAMLstring(title);

  // Function to truncate title to a safe length for filenames
  function truncateTitleForFilename(title) {
    const maxLength = 150; // A safe length for most file systems

    // Remove invalid characters
    let safeTitle = title.replace(/[/\\?%*:|"<>]/g, "-");

    // Truncate if longer than maxLength
    if (safeTitle.length > maxLength) {
      safeTitle = safeTitle.substring(0, maxLength).trim();
    }

    return safeTitle;
  }

  function fixNestedLinks(markdown) {
    const regex = /\[\s*!\[(.*?)]\((.*?)\)\s*]\((.*?)\)/gs;
    return markdown.replace(regex, (match, alt, url1, url2) => {
      return `![${alt}](${url1})`;
    });
  }

  // Modified to include date in filename
  const sanitizedTitleForFile = truncateTitleForFilename(sanitizedTitle);
  const today = convertDate(new Date());
  const fileName = `${today}-${sanitizedTitleForFile}`;

  const selection = getSelectionHtml();
  var markdownify;
  if (selection) {
    markdownify = selection;
  } else {
    markdownify = cleanupHTML(content);
  }

  const turndownService = createTurndownService();
  let markdownBody = turndownService.turndown(markdownify);

  // Fix nested links after Turndown processing
  markdownBody = fixNestedLinks(markdownBody);

  // --- SETTINGS POPUP ---
  const mode = prompt(
    "Choose capture mode:\n1. Link Only (Metadata)\n2. Full Capture\n\n(Enter 1 or 2)",
    "2"
  );

  let isMetadataOnly;
  if (mode === "1") {
    isMetadataOnly = true;
  } else if (mode === "2") {
    isMetadataOnly = false;
  } else {
    alert("Invalid choice. Aborting.");
    return; // Stop execution
  }

  // Generate appropriate tags based on mode
  const tagsYAML = generateTags(isMetadataOnly);

  if (vault) {
    var vaultName = "&vault=" + encodeURIComponent(`${vault}`);
  } else {
    var vaultName = "";
  }

  function convertDate(date) {
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString();
    const dd = date.getDate().toString();
    const mmChars = mm.split("");
    const ddChars = dd.split("");
    return (
      yyyy +
      "-" +
      (mmChars[1] ? mm : "0" + mmChars[0]) +
      "-" +
      (ddChars[1] ? dd : "0" + ddChars[0])
    );
  }

  const publicationDate = getPublicationDate();

  // Utility function to get meta content by name or property
  function getMetaContent(attr, value) {
    var element = document.querySelector(`meta[${attr}='${value}']`);
    return element ? element.getAttribute("content").trim() : "";
  }

  // Fetch byline, meta author, property author, or site name
  var author =
    byline ||
    getMetaContent("name", "author") ||
    getMetaContent("property", "author") ||
    getMetaContent("property", "og:site_name");

  // Check if there's an author and add brackets
  var authorBrackets = author ? `"[[${author}]]"` : "";

  // Get description
  var desc =
    getMetaContent("name", "description") ||
    getMetaContent("property", "description") ||
    getMetaContent("property", "og:description");
  const sanitizedDesc = sanitizeYAMLstring(desc);

  /* YAML front matter as tags render cleaner with special chars */
  // Create the file content based on mode
  const baseYAML =
    "---\n" +
    'id: "' +
    generateUUID() +
    '"\n' +
    'title: "' +
    sanitizedTitle +
    '"\n' +
    "author: " +
    authorBrackets +
    "\n" +
    tagsYAML +
    "\n" +
    "created_date: " +
    today +
    "\n" +
    "modified_date: " +
    today +
    "\n" +
    "source: " +
    document.URL +
    "\n" +
    "source_date: " +
    publicationDate +
    "\n" +
    'source_title: "' +
    sanitizedTitle +
    '"\n' +
    'source_description: "' +
    sanitizedDesc +
    '"\n' +
    "---\n\n";

  let fileContent;
  if (isMetadataOnly) {
    // Metadata-only mode: just the YAML front matter and title
    fileContent = baseYAML + "# " + sanitizedTitle + "\n";
  } else {
    // Full content mode: include the processed markdown content
    fileContent = baseYAML + "# " + sanitizedTitle + "\n" + markdownBody;
  }

  document.location.href =
    "obsidian://new?" +
    "file=" +
    encodeURIComponent(folder + fileName) +
    "&content=" +
    encodeURIComponent(fileContent) +
    vaultName;
})();
