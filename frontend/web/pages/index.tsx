import React from "react";
import type { NextPage } from "next";
import { useDropzone, FileWithPath } from "react-dropzone";

type ServiceResponse = { success: boolean; downloadUrl: string | null };

const Home: NextPage = () => {
  const [response, setResponse] = React.useState<ServiceResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean | null>(null);

  const onDrop = React.useCallback(async (acceptedFiles: FileWithPath[]) => {
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);

    const apiUrl =
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api/";

    const response: ServiceResponse = await (
      await fetch(new URL("csv2pdf/process", apiUrl).href, {
        method: "POST",
        body: formData,
      })
    ).json();
    setIsLoading(false);
    setResponse(response);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  return (
    <section className="container">
      {!response ? (
        isLoading ? (
          <span>loading...</span>
        ) : (
          <div
            style={{ border: "1px dashed", textAlign: "center" }}
            {...getRootProps({ className: "dropzone" })}
          >
            <input {...getInputProps()} />
            <p>drag and drop some files here, or click to select files</p>
          </div>
        )
      ) : (
        <>
          <button
            onClick={() => {
              setResponse(null);
              setIsLoading(null);
            }}
          >
            click to reset
          </button>
          <br />
          <br />

          <p>{JSON.stringify(response)}</p>
          {response.success ? (
            <a href={response.downloadUrl as string}>click to download</a>
          ) : null}
        </>
      )}
    </section>
  );
};

export default Home;
