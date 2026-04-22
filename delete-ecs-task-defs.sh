#!/usr/bin/env bash

# inspired by:
# https://gist.github.com/jen20/e1c25426cc0a4a9b53cbb3560a3f02d1

get_task_definition_arns() {
	aws ecs list-task-definitions \
		--region sa-east-1 \
		--output json \
		--status "INACTIVE" | jq -M -r '.taskDefinitionArns | .[]'
}

delete_task_definition() {
	local arn=$1

	echo $arn

	aws ecs delete-task-definitions \
		--region sa-east-1 \
		--task-definitions "${arn}" > /dev/null
}

# if [ -z "${AWS_REGION}" ] ; then
# 	(>&2 echo "AWS_REGION is not set")
# 	exit 1
# fi

for arn in $(get_task_definition_arns)
do
	echo "Deleting ${arn}..."
	delete_task_definition "${arn}"
done
