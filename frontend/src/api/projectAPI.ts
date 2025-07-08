import axios from "axios";

const API_URL = 'http://localhost:3000';

export const fetchProjects = async () => {
  const response = await axios.get(`${API_URL}/project`);
  return response.data;
};

export const createProject = async (project: {
  imageUrl: string;
  title: string;
  numColors: number;
}) => {
  const response = await axios.post(`${API_URL}/project`, project);
  return response.data;
};

export const processProject = async (projectId: number): Promise<{ processedImageUrl: string }> => {
  const response = await axios.post(`http://localhost:3000/project/${projectId}/process`);
  return response.data;
};
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('http://localhost:3000/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.imageUrl;
};
