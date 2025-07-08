import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useProjects } from './hooks/useProjects';
import { processProject, uploadImage, createProject } from './api/projectAPI';
import backgroundImage from './assets/background.png';

function App() {
  const { projects } = useProjects();

  const [file, setFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const imageUrl = await uploadImage(selectedFile);
        setUploadedImageUrl(imageUrl);
        setUploadSuccess(true);

        const createdProject = await createProject({
          title: 'My Project',
          imageUrl,
          numColors: 5,
        });

        setCurrentProjectId(createdProject.id);
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadSuccess(false);
      } finally {
        setSnackbarOpen(true);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!currentProjectId) return;
    setProcessing(true);
    try {
      const response = await processProject(currentProjectId);
      setProcessedImageUrl(`http://localhost:3000${response.processedImageUrl}`);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      padding={2}
      sx={{
        position: 'relative',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backgroundBlendMode: 'lighten',
      }}
    >
      {/* Drag & Drop */}
      <Box
        {...getRootProps()}
        border="1px dashed #333"
        borderRadius="12px"
        padding="4rem"
        textAlign="center"
        width="100%"
        maxWidth="400px"
        style={{
          cursor: 'pointer',
          transition: 'border 0.3s ease',
          borderColor: isDragActive ? '#111' : '#333',
          backgroundColor: 'rgba(255, 255, 255, 1)',
        }}
        mb={3}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Typography>Drop the file here ...</Typography>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: '#111', mb: 2 }} />
            <Typography color="#111" variant="h6" gutterBottom>
              Drag and drop
            </Typography>
            <Typography color="#111" variant="h6" gutterBottom>
              or
            </Typography>
            <Button
              variant="contained"
              component="span"
              sx={{
                backgroundColor: '#111',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#333',
                },
              }}
              startIcon={<CloudUploadIcon />}
            >
              Select a file
            </Button>

            <Box mt={8} mb={2} textAlign="center">
              <Typography variant="caption" color="textSecondary">
                © 2025 YourName. This tool is for personal use only. <br />
                Do not upload copyrighted images without permission.
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Create Art button */}
      {uploadedImageUrl && !processing && (
        <Button
          variant="contained"
          onClick={handleProcess}
          size="large"
          sx={{
            mb: 4,
            backgroundColor: '#111',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#333',
            },
          }}
        >
          Create Art
        </Button>
      )}

      {/* Loader */}
      {processing && (
        <>
          <CircularProgress sx={{ mb: 2, color: '#111' }} />
          <Typography color="#111">Creating your Art...</Typography>
        </>
      )}

      {/* Final Processed Image */}
      {processedImageUrl && !processing && (
        <Box
          component="img"
          src={processedImageUrl}
          alt="Paint by Number Result"
          sx={{
            mt: 4,
            width: '100%',
            maxWidth: '600px',
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          }}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={uploadSuccess ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {uploadSuccess
            ? 'File uploaded successfully!'
            : 'Upload failed. Please try again.'}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
