import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const viewerContainer = useRef(null);
  const viewer = useRef(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/models")
      .then((response) => response.json())
      .then((data) => setModels(data))
      .catch((error) => console.error("Error fetching models:", error));
  }, []);

  useEffect(() => {
    if (viewerContainer.current) {
      Autodesk.Viewing.Initializer({ getAccessToken }, () => {
        viewer.current = new Autodesk.Viewing.GuiViewer3D(
          viewerContainer.current
        );
        viewer.current.start();
      });
    }
  }, []);

  useEffect(() => {
    if (selectedModel && viewer.current) {
      loadModel(selectedModel);
    }
  }, [selectedModel]);

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const loadModel = (urn) => {
    setLoading(true);
    Autodesk.Viewing.Document.load(
      `urn:${urn}`,
      (doc) => {
        const viewables = doc.getRoot().getDefaultGeometry();
        viewer.current.loadDocumentNode(doc, viewables).then(() => {
          viewer.current.fitToView(); // Centrar el modelo en la vista
          setLoading(false);
          console.log("Model loaded successfully");
        });
      },
      (errorCode, errorMsg) => {
        setLoading(false);
        console.error(`Error loading document: ${errorCode} ${errorMsg}`);
      }
    );
  };

  const getAccessToken = async (onGetAccessToken) => {
    const resp = await fetch("http://localhost:3000/api/auth/token");
    if (!resp.ok) {
      throw new Error("Failed to fetch access token");
    }
    const { access_token, expires_in } = await resp.json();
    onGetAccessToken(access_token, expires_in);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("model-file", file);

    if (file.name.endsWith(".zip")) {
      const entrypoint = window.prompt(
        "Please enter the filename of the main design inside the archive."
      );
      formData.append("model-zip-entrypoint", entrypoint);
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:3000/api/models",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setModels([...models, response.data]);
      setSelectedModel(response.data.urn);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Error uploading model:", error);
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-1/4 h-full bg-gray-800 text-white p-4">
        <h1 className="text-xl">Model Viewer</h1>
        <select
          onChange={handleModelChange}
          className="bg-gray-700 text-white p-2 mt-4 w-full"
        >
          <option value="">Select a model</option>
          {models.map((model) => (
            <option key={model.urn} value={model.urn}>
              {model.name}
            </option>
          ))}
        </select>
        <label className="mt-4 inline-block bg-blue-500 text-white p-2 rounded cursor-pointer">
          Upload
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </aside>
      <main className="relative w-3/4 h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
            <div className="loader">Loading...</div>
          </div>
        )}
        <div ref={viewerContainer} className="absolute inset-0"></div>
      </main>
    </div>
  );
}

export default App;
