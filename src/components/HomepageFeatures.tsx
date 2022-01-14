import React from "react";
import clsx from "clsx";
import styles from "./HomepageFeatures.module.css";

type FeatureItem = {
	title: string;
	image?: string;
	description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
	{
		title: "Fully managed Rojo",
		description: (
			<>
				Gain the benefits of{" "}
				<a
					rel="noopener"
					target="blank"
					href="https://rojo.space/docs/v7/workflows/#fully-managed-rojo"
				>
					fully managed Rojo
				</a>
				. Models and scripts are stored as files, and are able to be
				tracked with Git.
			</>
		),
	},
	{
		title: "Rojo compatible",
		description: (
			<>
				Other project editors do not need to have Rostar installed to be
				able to work on the project.
			</>
		),
	},
	{
		title: "No extra configuration",
		description: (
			<>
				Rostar does not require any extra configuration. Specify an
				input rbxl/rbxlx file and it will extracted into the filesystem
				with ease.
			</>
		),
	},
];

function Feature({ title, image, description }: FeatureItem) {
	return (
		<div className={clsx("col col--4")}>
			{image && (
				<div className="text--center">
					<img
						className={styles.featureSvg}
						alt={title}
						src={image}
					/>
				</div>
			)}
			<div className="text--center padding-horiz--md">
				<h3>{title}</h3>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures(): JSX.Element {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props, idx) => (
						<Feature key={idx} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
