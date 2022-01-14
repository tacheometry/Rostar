// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const TAGLINE = "Dead simple fully managed Rojo helper for Roblox projects";

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: "Rostar",
	tagline: TAGLINE,
	url: "https://tacheometry.github.io/Rostar",
	baseUrl: "/Rostar/",
	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",
	favicon: "img/favicon.ico",
	organizationName: "tacheometry", // Usually your GitHub org/user name.
	projectName: "Rostar", // Usually your repo name.
	deploymentBranch: "gh-pages",
	trailingSlash: true,
	presets: [
		[
			"classic",
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					sidebarPath: require.resolve("./sidebars.js"),
					// Please change this to your repo.
					editUrl:
						"https://github.com/tacheometry/Rostar/tree/main/packages/create-docusaurus/templates/shared/",
				},
				blog: {
					showReadingTime: false,
					// Please change this to your repo.
					editUrl:
						"https://github.com/tacheometry/Rostar/tree/main/packages/create-docusaurus/templates/shared/",
				},
				theme: {
					customCss: require.resolve("./src/css/custom.css"),
				},
			}),
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			navbar: {
				title: "Rostar",
				logo: {
					alt: "Rostar logo",
					src: "img/logo.svg",
				},
				items: [
					{
						type: "doc",
						docId: "intro",
						position: "left",
						label: "Tutorial",
					},
					{
						href: "https://github.com/tacheometry/Rostar",
						label: "GitHub",
						position: "right",
					},
				],
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
			metadata: [
				{ name: "description", content: TAGLINE },
				{ name: "theme-color", content: "#f28f15" },
			],
		}),
};

module.exports = config;
