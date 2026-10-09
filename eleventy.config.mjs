import markdownIt from "markdown-it";

const md = markdownIt({ html: true, typographer: false });

export default function (eleventyConfig) {
  // Files that are not generated: media, fonts and scripts.
  eleventyConfig.addPassthroughCopy({ assets: "assets" });
  eleventyConfig.addPassthroughCopy({ people: "people" });
  eleventyConfig.addPassthroughCopy({ "robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "googlea41968495f846a3f.html": "googlea41968495f846a3f.html" });

  // Rich-text fields written in Markdown inside the data files.
  eleventyConfig.addFilter("md", (value) => (value ? md.render(String(value)) : ""));
  eleventyConfig.addFilter("mdInline", (value) => (value ? md.renderInline(String(value)) : ""));

  // Artists, in exhibition order.
  eleventyConfig.addCollection("artists", (api) =>
    api.getFilteredByGlob("src/artists/*.md").sort((a, b) => (a.data.order || 99) - (b.data.order || 99))
  );

  // Objects, one file per piece.
  eleventyConfig.addCollection("objects", (api) =>
    api.getFilteredByGlob("src/objects/*.md").sort((a, b) => (a.data.order || 99) - (b.data.order || 99))
  );

  eleventyConfig.addFilter("byArtist", (objects = [], slug) =>
    objects.filter((entry) => entry.data.artist === slug)
  );

  eleventyConfig.addFilter("featuredObjects", (objects = [], limit = 3) =>
    objects.filter((entry) => entry.data.featured).slice(0, limit)
  );

  // The artist shown in the landing page's exhibition block.
  eleventyConfig.addFilter("findArtist", (artists = [], slug) =>
    artists.find((entry) => entry.data.slug === slug || entry.fileSlug === slug)
  );

  // Objects ticked as "featured" appear on the landing page.
  eleventyConfig.addFilter("featured", (objects = [], limit = 3) =>
    objects.filter((object) => object.featured).slice(0, limit)
  );

  eleventyConfig.setLiquidOptions({ jsTruthy: true });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
