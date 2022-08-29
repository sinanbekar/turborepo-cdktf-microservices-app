// a hacky way to bundle a function/layer compatible with cdktf
// and get bundled dir to archive as a zip file

import { Construct } from "constructs";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { TerraformAsset, AssetType } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import { Stack, App, cx_api as cxapi } from "aws-cdk-lib";
import type { Asset } from "aws-cdk-lib/aws-s3-assets";
import type {
  PythonFunction as LambdaPythonFunction,
  PythonLayerVersion as LambdaPythonLayerVersion,
} from "@aws-cdk/aws-lambda-python-alpha";
import type { NodejsFunction as LambdaNodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type {
  Function as LambdaFunction,
  LayerVersion as LambdaLayerVersion,
} from "aws-cdk-lib/aws-lambda";

let dummyStack: Stack;
const defaultOutdir = path.join(os.tmpdir(), "cdktf-lambda-asset");

export function getDummyStack() {
  if (!fs.existsSync(defaultOutdir)) {
    fs.mkdirSync(defaultOutdir);
  }
  dummyStack =
    dummyStack ??
    new Stack(
      new App({
        autoSynth: false,
        outdir: defaultOutdir,
        context: {
          [cxapi.NEW_STYLE_STACK_SYNTHESIS_CONTEXT]: false,
          [cxapi.ASSET_RESOURCE_METADATA_ENABLED_CONTEXT]: false,
        },
      })
    );

  return dummyStack;
}

type BaseAdapterLambdaFunctionType =
  | LambdaFunction
  | LambdaNodejsFunction
  | LambdaPythonFunction;

type BaseAdapterLambdaLayerVersion =
  | LambdaPythonLayerVersion
  | LambdaLayerVersion;

export class BaseAdapterFunction extends aws.lambdafunction.LambdaFunction {
  constructor(
    scope: Construct,
    id: string,
    config: aws.lambdafunction.LambdaFunctionConfig,
    func: BaseAdapterLambdaFunctionType
  ) {
    const { assetPath: assetPathdir, assetHash } = func.node.tryFindChild(
      "Code"
    ) as Asset;
    const assetPath = new TerraformAsset(scope, `${id}Archive`, {
      assetHash,
      path: path.join(defaultOutdir, assetPathdir),
      type: AssetType.ARCHIVE,
    }).path;

    const s3Object = config.s3Bucket
      ? new aws.s3.S3Object(scope, `${id}S3`, {
          bucket: config.s3Bucket,
          key: config.s3Key ?? `asset-${assetHash}`,
          source: assetPath,
        })
      : undefined;

    super(scope, id, {
      ...config,
      s3Bucket: s3Object?.bucket,
      s3Key: s3Object?.key,
      filename: !s3Object?.key ? assetPath : undefined,
      handler: config.handler ?? "index.handler",
      runtime: config.runtime,
    });
  }
}

export class BaseAdapterLayerVersion extends aws.lambdafunction
  .LambdaLayerVersion {
  constructor(
    scope: Construct,
    id: string,
    config: aws.lambdafunction.LambdaLayerVersionConfig,
    layer: BaseAdapterLambdaLayerVersion
  ) {
    const { assetPath: assetPathdir, assetHash } = layer.node.tryFindChild(
      "Code"
    ) as Asset;
    const assetPath = new TerraformAsset(scope, `${id}Archive`, {
      assetHash,
      path: path.join(defaultOutdir, assetPathdir),
      type: AssetType.ARCHIVE,
    }).path;

    const s3Object = config.s3Bucket
      ? new aws.s3.S3Object(scope, `${id}Archive`, {
          bucket: config.s3Bucket,
          key: config.s3Key ?? `asset-${assetHash}`,
          source: assetPath,
        })
      : undefined;

    super(scope, id, {
      ...config,
      s3Bucket: s3Object?.bucket,
      s3Key: s3Object?.key,
      filename: !s3Object?.key ? assetPath : undefined,
    });
  }
}
