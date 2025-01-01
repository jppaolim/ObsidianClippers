javascript: (async () => {
  /* Optional vault name */
  const vault = "Main";

  /* Optional folder name such as "Clippings/" */
  const folder = "References/Capture/";

  // Function to extract and parse publication date
  function getPublicationDate() {
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

  // Utility function to get meta content by name or property
  function getMetaContent(attr, value) {
    var element = document.querySelector(`meta[${attr}='${value}']`);
    return element ? element.getAttribute("content").trim() : "";
  }

  // Function to extract author information
  function getAuthor() {
    return (
      getMetaContent("name", "author") ||
      getMetaContent("property", "author") ||
      getMetaContent("property", "article:author") ||
      getMetaContent("name", "bylines")
    );
  }

  // Function to sanitize strings for YAML
  function sanitizeYAMLstring(str) {
    return str.replace(/["'“”‘’]/g, "").replace(/[:\n]/g, " ");
  }

  // Function to sanitize file names
  function getFileName(fileName) {
    const invalidChars = /[:/\\?%*|"<>]/g;
    return fileName.replace(invalidChars, " - ").replace(/\s+/g, " ").trim();
  }

  // Function to convert date to форматеാരോഗ്യ-MM-DD format
  function convertDate(date) {
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

  // Extract title from common meta tags or document title
  let title =
    getMetaContent("property", "og:title") ||
    getMetaContent("name", "twitter:title") ||
    document.title ||
    "";

  // Extract description from common meta tags
  const description =
    getMetaContent("name", "description") ||
    getMetaContent("property", "og:description") ||
    getMetaContent("name", "twitter:description") ||
    "";

  // Sanitize and truncate the title for filename
  const sanitizedTitle = sanitizeYAMLstring(title);
  const truncatedTitle = truncateTitleForFilename(sanitizedTitle);
  const fileName = `${convertDate(new Date())}-${truncatedTitle}`;

  // Prepare data for Obsidian
  const today = convertDate(new Date());
  const publicationDate = getPublicationDate();
  const author = getAuthor() || "";
  const authorLink = author ? `[[${author}]]` : "";
  const sanitizedDesc = sanitizeYAMLstring(description);

  // Construct YAML front matter
  const yamlFrontMatter = `---
id: "${generateUUID()}"
title: "${sanitizedTitle}"
author: "${authorLink}"
tags:
  - AI
created_date: ${today}
modified_date: ${today}
source: ${document.URL}
source_date: ${publicationDate}
source_title: "${sanitizedTitle}"
source_description: "${sanitizedDesc}"
---
  
`;

  // Combine YAML and markdown content (no content extraction, just link)
  const fileContent =
    yamlFrontMatter +
    "# " +
    sanitizedTitle +
    "\n" +
    `[Read more](${document.URL})`;

  // Obsidian URL scheme
  const obsidianUrl = `obsidian://new?file=${encodeURIComponent(
    folder + fileName
  )}&content=${encodeURIComponent(fileContent)}${
    vault ? "&vault=" + encodeURIComponent(vault) : ""
  }`;

  // Open in Obsidian
  document.location.href = obsidianUrl;
})();
