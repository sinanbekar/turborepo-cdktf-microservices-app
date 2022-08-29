import * as aws from "@cdktf/provider-aws";
import { Construct } from "constructs";
import {
  NodejsFunction as LambdaNodejsFunction,
  NodejsFunctionProps as LambdaNodejsFunctionProps,
  LogLevel as LambdaNodejsLogLevel,
} from "aws-cdk-lib/aws-lambda-nodejs";
import {
  Function as LambdaFunction,
  FunctionProps as LambdaFunctionProps,
  LayerVersion as LambdaLayerVersion,
  LayerVersionProps as LambdaLayerVersionProps,
  Runtime,
  RuntimeFamily,
  Code,
} from "aws-cdk-lib/aws-lambda";
import {
  BaseAdapterFunction,
  BaseAdapterLayerVersion,
  getDummyStack,
} from "./asset-util";
import {
  PythonFunction as LambdaPythonFunction,
  PythonFunctionProps as LambdaPythonFunctionProps,
  PythonLayerVersion as LambdaPythonLayerVersion,
  PythonLayerVersionProps as LambdaPythonLayerVersionProps,
} from "@aws-cdk/aws-lambda-python-alpha";

export type NodejsFunctionProps = aws.lambdafunction.LambdaFunctionConfig & {
  bundling: LambdaNodejsFunctionProps["bundling"];
  entry: LambdaNodejsFunctionProps["entry"];
};

export type PythonFunctionProps = aws.lambdafunction.LambdaFunctionConfig & {
  bundling: LambdaPythonFunctionProps["bundling"];
  entry: LambdaPythonFunctionProps["entry"];
};

export type PythonPoetryFunctionProps =
  aws.lambdafunction.LambdaFunctionConfig & {
    entry: string;
  };

export type FunctionProps = aws.lambdafunction.LambdaFunctionConfig & {
  code: LambdaFunctionProps["code"];
};

export class Function extends BaseAdapterFunction {
  constructor(scope: Construct, id: string, config: FunctionProps) {
    const handler = config.handler ?? "index.handler";
    const runtime = new Runtime(config.runtime as string);

    super(
      scope,
      id,
      config,
      new LambdaFunction(getDummyStack(), id, {
        code: config.code,
        handler: handler,
        runtime: runtime,
      })
    );
  }
}

export class NodejsFunction extends BaseAdapterFunction {
  constructor(scope: Construct, id: string, config: NodejsFunctionProps) {
    const handler = config.handler ?? "index.handler";
    const runtime = config.runtime
      ? new Runtime(config.runtime, RuntimeFamily.NODEJS)
      : Runtime.NODEJS_16_X;

    super(
      scope,
      id,
      { ...config, handler, runtime: runtime.name },
      new LambdaNodejsFunction(getDummyStack(), id, {
        entry: config.entry,
        bundling: {
          logLevel: LambdaNodejsLogLevel.ERROR, // hide unnecessarry logs, overrideable
          ...config.bundling,
          externalModules: [
            "aws-sdk",
            ...(config.bundling?.externalModules ?? []),
          ],
        },
        handler: handler.replace("index.", ""), // nodejsfunction adds `index.`
        runtime,
      })
    );
  }
}

export class PythonFunction extends BaseAdapterFunction {
  constructor(scope: Construct, id: string, config: PythonFunctionProps) {
    const handler = config.handler ?? "index.handler";
    const runtime = config.runtime
      ? new Runtime(config.runtime, RuntimeFamily.PYTHON)
      : Runtime.PYTHON_3_8;

    super(
      scope,
      id,
      { ...config, handler },
      new LambdaPythonFunction(getDummyStack(), id, {
        bundling: config.bundling,
        entry: config.entry,
        handler,
        runtime,
      })
    );
  }
}

// TODO
// hotfix https://github.com/aws/aws-cdk/issues/19232
export class PythonPoetryFunction extends BaseAdapterFunction {
  constructor(scope: Construct, id: string, config: PythonPoetryFunctionProps) {
    const handler = config.handler ?? "index.handler";
    const runtime = config.runtime
      ? new Runtime(config.runtime, RuntimeFamily.PYTHON)
      : Runtime.PYTHON_3_8;

    super(
      scope,
      id,
      { ...config, handler, runtime: runtime.name },
      new LambdaFunction(getDummyStack(), id, {
        handler,
        runtime,
        code: Code.fromAsset(config.entry, {
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
      })
    );
  }
}

export class LayerVersion extends BaseAdapterLayerVersion {
  constructor(scope: Construct, id: string, config: LambdaLayerVersionProps) {
    super(
      scope,
      id,
      {
        layerName: config.layerVersionName ?? `${id}Layer`,
        compatibleArchitectures: config.compatibleArchitectures?.map(
          (architecture) => architecture.name
        ),
        compatibleRuntimes: config.compatibleRuntimes?.map(
          (runtime) => runtime.name
        ),
      },
      new LambdaLayerVersion(getDummyStack(), id, config)
    );
  }
}

export class PythonLayerVersion extends BaseAdapterLayerVersion {
  constructor(
    scope: Construct,
    id: string,
    config: LambdaPythonLayerVersionProps
  ) {
    super(
      scope,
      id,
      {
        layerName: config.layerVersionName ?? `${id}PythonLayer`,
        compatibleArchitectures: config.compatibleArchitectures?.map(
          (architecture) => architecture.name
        ),
        compatibleRuntimes: config.compatibleRuntimes?.map(
          (runtime) => runtime.name
        ),
      },
      new LambdaPythonLayerVersion(getDummyStack(), id, config)
    );
  }
}
