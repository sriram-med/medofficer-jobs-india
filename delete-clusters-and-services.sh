#!/usr/bin/env bash

# inspired by:
# https://gist.github.com/jen20/e1c25426cc0a4a9b53cbb3560a3f02d1

get_cluster_arns() {
  aws ecs list-clusters --region sa-east-1 \
		--output json \
		| jq -M -r '.clusterArns | .[]'
}

get_service_arns() {
	local arn=$1

	echo $arn

	aws ecs list-services --region sa-east-1 \
		--cluster "${arn}" \
		--output json \
		| jq -M -r '.serviceArns | .[]'
}

delete_services() {
	local arn=$1

	for service_arn in $(get_service_arns "${arn}")
	do
		echo "Deleting service ${arn}..."
		aws ecs delete-service \
			--region sa-east-1 \
			--cluster "${arn}" \
			--service "${service_arn}" \
			--output json \
			--force > /dev/null
	done
}

delete_cluster() {
	local arn=$1
	aws ecs delete-cluster \
		--region sa-east-1 \
		--cluster "${arn}" > /dev/null
}

for arn in $(get_cluster_arns)
do
	echo "Deleting services ${arn}..."
	delete_services "${arn}"

	echo "Deleting cluster ${arn}..."
	delete_cluster "${arn}"
done
