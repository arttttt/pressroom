const { execFileSync } = require("node:child_process");
const path = require("node:path");

/**
 * Signs the packed application ad hoc, before the disk image is built.
 *
 * There is no developer certificate here and no notarisation: this is built on
 * the machine it runs on. But Apple Silicon will not launch a bundle carrying
 * no signature at all — it reports "Pressroom is damaged and can't be opened",
 * which sounds like a broken download and is not.
 *
 * An ad hoc signature (`-`) fixes exactly that and claims nothing else: it
 * says who made this no more than an unsigned binary does. It has to happen
 * here rather than after installing, because the image has to contain an
 * application that already launches.
 */
exports.default = async function adhocSign(context) {
	const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
	// `--deep` reaches the framework and the helper bundles inside, which are
	// separate signatures of their own.
	execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
	execFileSync("codesign", ["--verify", "--strict", app], { stdio: "inherit" });
};
