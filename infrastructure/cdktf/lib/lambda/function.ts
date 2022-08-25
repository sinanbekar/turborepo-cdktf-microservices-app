import * as aws from "@cdktf/provider-aws";
import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
} from "aws-cdk-lib";
import { generateLambdaAssetForTerraform } from "./asset-util";
import {
  PythonFunction as LambdaPythonFunction,
  PythonFunctionProps as LambdaPythonFunctionProps,
} from "@aws-cdk/aws-lambda-python-alpha";

export type NodejsFunctionAssetProps =
  Partial<lambdaNodejs.NodejsFunctionProps>;
export type PythonFunctionAssetProps = Partial<LambdaPythonFunctionProps>;
export type PythonPoetryFunctionAssetProps = Partial<lambda.FunctionProps> & {
  entry: string;
};

export type NodejsFunctionProps = aws.lambdafunction.LambdaFunctionConfig & {
  assetProps: NodejsFunctionAssetProps;
};
export type PythonFunctionProps = aws.lambdafunction.LambdaFunctionConfig & {
  assetProps: PythonFunctionAssetProps;
};
export type PythonPoetryFunctionProps =
  aws.lambdafunction.LambdaFunctionConfig & {
    assetProps: PythonPoetryFunctionAssetProps;
  };

export class NodejsFunction extends aws.lambdafunction.LambdaFunction {
  constructor(scope: Construct, id: string, config: NodejsFunctionProps) {
    const handler =
      config.handler ?? config.assetProps.handler ?? "index.handler";
    const runtime = config.runtime
      ? new lambda.Runtime(config.runtime, lambda.RuntimeFamily.NODEJS)
      : config.assetProps.runtime ?? lambda.Runtime.NODEJS_16_X;

    const assetData = generateLambdaAssetForTerraform(
      scope,
      `${id}Asset`,
      lambdaNodejs.NodejsFunction,
      {
        ...config.assetProps,
        bundling: {
          ...config.assetProps.bundling,
          logLevel: lambdaNodejs.LogLevel.ERROR,
        },
        handler,
        runtime,
      }
    );

    const s3Object = config.s3Bucket
      ? new aws.s3.S3Object(scope, `${id}Archive`, {
          bucket: config.s3Bucket,
          key: `${
            assetData.asset.assetHash
          }-${assetData.asset.fileName.toLowerCase()}`,
          source: assetData.asset.path, // returns a posix path
        })
      : undefined;

    super(scope, id, {
      ...config,
      s3Bucket: s3Object?.bucket,
      s3Key: s3Object?.key,
      filename: !s3Object?.key ? assetData.filename : undefined,
      sourceCodeHash: assetData.sourceCodeHash,
      handler,
      runtime: runtime.name,
    });
  }
}

export class PythonFunction extends aws.lambdafunction.LambdaFunction {
  constructor(scope: Construct, id: string, config: PythonFunctionProps) {
    const handler =
      config.handler ?? config.assetProps.handler ?? "index.handler";
    const runtime = config.runtime
      ? new lambda.Runtime(config.runtime, lambda.RuntimeFamily.PYTHON)
      : config.assetProps.runtime ?? lambda.Runtime.PYTHON_3_8;

    const assetData = generateLambdaAssetForTerraform(
      scope,
      `${id}Asset`,
      LambdaPythonFunction,
      {
        ...config.assetProps,
        handler,
        runtime,
      }
    );

    const s3Object = config.s3Bucket
      ? new aws.s3.S3Object(scope, `${id}Archive`, {
          bucket: config.s3Bucket,
          key: `${
            assetData.asset.assetHash
          }-${assetData.asset.fileName.toLowerCase()}`,
          source: assetData.asset.path, // returns a posix path
        })
      : undefined;

    super(scope, id, {
      ...config,
      s3Bucket: s3Object?.bucket,
      s3Key: s3Object?.key,
      filename: !s3Object?.key ? assetData.filename : undefined,
      sourceCodeHash: assetData.sourceCodeHash,
      handler,
      runtime: runtime.name,
    });
  }
}

export class PythonPoetryFunction extends aws.lambdafunction.LambdaFunction {
  constructor(scope: Construct, id: string, config: PythonPoetryFunctionProps) {
    const handler =
      config.handler ?? config.assetProps.handler ?? "index.handler";
    const runtime = config.runtime
      ? new lambda.Runtime(config.runtime, lambda.RuntimeFamily.PYTHON)
      : config.assetProps.runtime ?? lambda.Runtime.PYTHON_3_8;

    const assetData = generateLambdaAssetForTerraform(
      scope,
      `${id}Asset`,
      LambdaPythonFunction,
      {
        ...config.assetProps,
        handler,
        runtime,
        code: lambda.Code.fromAsset(config.assetProps.entry, {
          bundling: {
            image: runtime.bundlingImage,
            environment: {
              PIP_NO_CACHE_DIR: "on",
              PIP_DISABLE_PIP_VERSION_CHECK: "on",
            },
            command: [
              "bash",
              "-c",
              [
                "python3 -m pip install --user pipx",
                "python3 -m pipx ensurepath",
                "python3 -m pipx install poetry",
                "python3 -m pipx run poetry export --without-hashes --with-credentials --format requirements.txt --output /asset-output/requirements.txt",
                "python3 -m pip install -r /asset-output/requirements.txt -t /asset-output/python",
                "cp -au . /asset-output",
              ].join(" && "),
            ],
            user: "root",
          },
        }),
      }
    );

    const s3Object = config.s3Bucket
      ? new aws.s3.S3Object(scope, `${id}Archive`, {
          bucket: config.s3Bucket,
          key: `${
            assetData.asset.assetHash
          }-${assetData.asset.fileName.toLowerCase()}`,
          source: assetData.asset.path, // returns a posix path
        })
      : undefined;

    super(scope, id, {
      ...config,
      s3Bucket: s3Object?.bucket,
      s3Key: s3Object?.key,
      filename: !s3Object?.key ? assetData.filename : undefined,
      sourceCodeHash: assetData.sourceCodeHash,
      handler,
      runtime: runtime.name,
    });
  }
}

export const Runtime = lambda.Runtime;
