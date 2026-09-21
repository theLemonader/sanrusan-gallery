import markdownIt from "markdown-it";

const md = markdownIt({ html: true, typographer: false });

export default function (eleventyConfig) {
  // Files that are not generated: media, fonts, scripts, the outreach pages, the CMS panel.
  eleventyConfig.addPassthroughCopy({ assets: "assets" });
  eleventyConfig.addPassthroughCopy({ people: "people" });
  eleventyConfig.addPassthroughCopy({ artists: "artists" });
  eleventyConfig.addPassthroughCopy({ "robots.txt": "robots.txt" });

  // Rich-text fields written in Markdown inside the data files.
  eleventyConfig.addFilter("md", (value) => (value ? md.render(String(value)) : ""));
  eleventyConfig.addFilter("mdInline", (value) => (value ? md.renderInline(String(value)) : ""));

  // Artists, in exhibition order.
  eleventyConfig.addCollection("artists", (api) =>
    api.getFilteredByGlob("src/artists/*.md").sort((a, b) => (a.data.order || 99) - (b.data.order || 99))
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
