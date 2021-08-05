javascript: Promise.all([import('https://unpkg.com/turndown@6.0.0?module'), import('https://unpkg.com/@tehshrike/readability@0.2.0'), ]).then(async ([{
    default: Turndown
}, {
    default: Readability
}]) => {
    const {
        title,
        byline,
        content
    } = new Readability(document.cloneNode(true)).parse();

    const titleUri = title.replace(':', '').replace(/\//g, '-').replace(/\\/g, '-');

    const markdown = new Turndown({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    }).turndown(content);

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

    const obsidian = `author:: ${byline}\nsource:: [${title}](${document.URL})\nclipped:: [[${today}]]\npublished:: \n\n#clippings\n\n${markdown}`;
    
    window.location.href = "obsidian://new?"
      + "name=" + titleUri
      + "&content="     
      + encodeURIComponent(obsidian) + "" ;
})