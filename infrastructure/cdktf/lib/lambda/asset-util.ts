// a hacky way to bundle a function/layer compatible with cdktf
// and get bundled dir to archive as a zip file

import { Construct } from "constructs";
import { Stack, App/*, cx_api as cxapi*/ } from "aws-cdk-lib";
import {
  AssetStaging,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
} from "aws-cdk-lib";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { TerraformAsset, AssetType } from "cdktf";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";

let dummyStack: Stack;

function getDummyStack({ outdir }: { outdir?: string }) {
  dummyStack =
    dummyStack ??
    new Stack(
      new App({
        autoSynth: false,
        outdir: outdir,
        //context: {
        //  [cxapi.NEW_STYLE_STACK_SYNTHESIS_CONTEXT]: false,
        //},
      })
    );

  return dummyStack;
}

type AssetFunctionType =
  | typeof lambda.Function
  | typeof lambdaNodejs.NodejsFunction
  | typeof PythonFunction
  | typeof lambda.LayerVersion;

function initCatcher<T extends AssetFunctionType>(
  type: T,
  props: ConstructorParameters<T>[2]
) {
  const outdir = path.join(os.tmpdir(), "cdktf-lambda-asset");
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir);
  }
  const dummyStack = getDummyStack({
    outdir,
  });
  let assetCodeProps!: lambda.AssetCode;

  if ("code" in props) {
    assetCodeProps = props.code as lambda.AssetCode;
  } else {
    class Catcher {
      constructor(
        _scope: Construct,
        _id: string,
        props: unknown & { code: lambda.AssetCode }
      ) {
        assetCodeProps = props.code;
      }
      addEnvironment() {}
    }

    Object.setPrototypeOf(type.prototype, Catcher.prototype);
    Object.setPrototypeOf(type, Catcher);

    //@ts-ignore
    new type(dummyStack, "dummy", props);
  }

  return { assetCodeProps, dummyStack };
}

function generateLambdaAsset<T extends AssetFunctionType>(
  scope: Construct,
  id: string,
  type: T,
  props: ConstructorParameters<T>[2]
) {
  const { assetCodeProps, dummyStack } = initCatcher(type, props);
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.npm_config_strict_peer_dependencies = "false";
  // stage the asset source (conditionally).
  const staging = new AssetStaging(dummyStack, `${id}DummyAssetStage`, {
    ...assetCodeProps["options"], // accessing private
    sourcePath: assetCodeProps.path,
    //follow: assetProps.followSymlinks ?? toSymlinkFollow(assetProps.follow), // TODO
  });

  return new TerraformAsset(scope, id, {
    // assetHash: staging.assetHash,
    path: staging.absoluteStagedPath,
    type: AssetType.ARCHIVE,
  });
}

export function generateLambdaAssetForTerraform(
  ...paramaters: Parameters<typeof generateLambdaAsset>
) {
  const asset = generateLambdaAsset(...paramaters);
  return { filename: asset.path, sourceCodeHash: asset.assetHash, asset };
}
