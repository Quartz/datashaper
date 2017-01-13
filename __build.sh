#!/bin/bash
CURR_COMMIT=$(git log --oneline -n 1)

printf '%s\n' "Copying built files to master repo"
printf '%s\n' -------------------------
rsync -rtvu --delete ./build/* $1

cd $1
QZDATA_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ "$3" = true ]]; then
	printf '%s\n' "Committing ${CURR_COMMIT} to origin:${QZDATA_BRANCH}"
	printf '%s\n' -------------------------
	git add .
	git commit -m "built: ${2} | ${CURR_COMMIT}"
fi

if [[ "$4" = true ]]; then
	printf '%s\n' "Executing dry run of git push to origin:${QZDATA_BRANCH}"
	printf '%s\n' -------------------------
	echo `git push  --dry-run origin ${QZDATA_BRANCH}`
	printf '%s\n' "That was a dry run to origin:${QZDATA_BRANCH}. Actually push? (y/n)"
	 read cont </dev/tty
	if [[ "$cont" != "y" ]]; then
	  exit
	fi
	 printf '%s\n' "Pushing to origin:${QZDATA_BRANCH}"
	printf '%s\n' -------------------------
	git push origin ${QZDATA_BRANCH}
	exit
fi
