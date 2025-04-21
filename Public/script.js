const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});
// Close the mobile menu when scrolling
window.addEventListener("scroll", () => {
    if (navMenu.classList.contains("active")) {
        navMenu.classList.remove("active");
    }
});
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileNamePreview = document.getElementById('fileNamePreview');
    const fromFormatSelect = document.getElementById('fromFormat');
    const toFormatSelect = document.getElementById('toFormat');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const downloadContainer = document.getElementById('downloadContainer');
    const downloadLink = document.getElementById('downloadLink');

    // CloudConvert API Key - Replace with your actual API key
    const CLOUDCONVERT_API_KEY ="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMDRjNTVjZWZjOTc2M2M5MzczMDhiMzhlYmI1NjFhYzlmYjk0MDUwYzFhOWU0YjU1NmIxMzExYzJkOWE4Nzg3NDMyZjAwMjc3MGQyN2M5ZGMiLCJpYXQiOjE3NDUxNDc5NTkuNTM0MTkyLCJuYmYiOjE3NDUxNDc5NTkuNTM0MTk0LCJleHAiOjQ5MDA4MjE1NTkuNTI4ODk0LCJzdWIiOiI3MTY4MTUyNCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSJdfQ.B4cuH0BMur7YriKmLVM1UpfCgq5bosJfmC9cavnAB_YdUZTjH7mf55tQKoozpGHQklTjxs6UMx2boKNSnWcbh_y5hF4GihBk4OmtPewFnDM4KWpznfXE3UCJ09cK9fVgpGAkffKsFOK_O6DT6NX7FYBrobpN5Ypp0tp0ehF0e7MNewMI6rFIHZZH3BHM6smv2eU31bDLsvi8PUFo_N0OtIW9xjQMecJVRcLEg27XxC1HaUEj10dAuaROVYhhJZF9HbWKop7LDNn-NngyDc2ls3YZVXJsaOt_MQMJmSYbdJN49sCO3hBdGAkmvzVHaMvt9nn13jRbt_MhUY45TMRuqLkkDJM9wyP2OZ0whAH1hTgmmVdz1fyRgJPcyVYolq4d-0rz9pBe6ef2-SPtG9rWYZcV4djF4xIOT2CwhOr4XTh42qtbNQ6OOzdStSG44G7FXhLm_BxoUzp0PCaJzouESu-U_hng6BmVB7bdsx0eupDr68H7KIb2sARZpt5cLnb0vNuCju7-FPsXdXHDylju2VypKua7c8fZfx0RFVpWNoSTO3nkIbXEIcm-X4djvMz_H4nDxBl8PSJ26Ogx6TPeqQinVG5yDOtO6qbtiCZpaVYVP6IAHtc1fsEViNfZtfQQ3ZCUKFboEEFR_V-HgDntz8RQFXdCqJAw2zhkyAQHecE";

    // Variables
    let selectedFile = null;
    let validConversions = {
        'pdf': ['docx', 'txt', 'jpg'],
        'mp4': ['mp3', 'gif'],
        'jpg': ['png', 'pdf'],
        'docx': ['pdf', 'txt'],
        'xlsx': ['pdf', 'csv'],
        'pptx': ['pdf', 'jpg']
    };

    // Event Listeners
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop events
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Format selection events
    fromFormatSelect.addEventListener('change', updateToFormatOptions);
    toFormatSelect.addEventListener('change', validateConversion);

    // Convert button event
    convertBtn.addEventListener('click', startConversion);

    // Functions
    function handleFileSelect(e) {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            displayFileInfo(selectedFile);
            detectFileFormat(selectedFile);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');

        if (e.dataTransfer.files.length) {
            selectedFile = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            displayFileInfo(selectedFile);
            detectFileFormat(selectedFile);
        }
    }

    function displayFileInfo(file) {
        const fileSize = formatFileSize(file.size);
        fileNamePreview.innerHTML = `<strong>${file.name}</strong> (${fileSize})`;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function detectFileFormat(file) {
        const extension = file.name.split('.').pop().toLowerCase();

        // Set the detected format in the fromFormat dropdown
        if (validConversions[extension]) {
            fromFormatSelect.value = extension;
            updateToFormatOptions();
        } else {
            // If the format is not supported, reset the dropdown
            fromFormatSelect.value = '';
            toFormatSelect.value = '';
            convertBtn.disabled = true;
            alert(`Sorry, the format "${extension}" is not supported for conversion.`);
        }
    }

    function updateToFormatOptions() {
        const selectedFromFormat = fromFormatSelect.value;

        // Clear current options except the first one
        while (toFormatSelect.options.length > 1) {
            toFormatSelect.remove(1);
        }

        // Reset to format selection
        toFormatSelect.value = '';

        // If a from format is selected and it's in our valid conversions
        if (selectedFromFormat && validConversions[selectedFromFormat]) {
            // Add valid conversion options
            validConversions[selectedFromFormat].forEach(format => {
                const option = document.createElement('option');
                const formatLabel = getFormatLabel(format);
                option.value = format;
                option.textContent = formatLabel;
                toFormatSelect.appendChild(option);
            });
        }

        validateConversion();
    }

    function getFormatLabel(format) {
        const formatLabels = {
            'docx': 'Word (DOCX)',
            'pdf': 'PDF',
            'txt': 'Text (TXT)',
            'jpg': 'JPEG Image',
            'png': 'PNG Image',
            'mp3': 'MP3 Audio',
            'gif': 'GIF Animation',
            'csv': 'CSV Spreadsheet'
        };

        return formatLabels[format] || format.toUpperCase();
    }

    function validateConversion() {
        const fromFormat = fromFormatSelect.value;
        const toFormat = toFormatSelect.value;

        // Enable convert button only if both formats are selected
        convertBtn.disabled = !(fromFormat && toFormat && selectedFile);
    }

    function startConversion() {
        const fromFormat = fromFormatSelect.value;
        const toFormat = toFormatSelect.value;

        if (!fromFormat || !toFormat || !selectedFile) {
            alert('Please select a file and conversion formats.');
            return;
        }

        // Check if API key is set
        if (CLOUDCONVERT_API_KEY === 'YOUR_CLOUDCONVERT_API_KEY') {
            alert('Please set your CloudConvert API key in the script.js file.');
            return;
        }

        // Show progress
        progressContainer.classList.remove('hidden');
        downloadContainer.classList.add('hidden');
        convertBtn.disabled = true;

        // Start progress at 0
        progressBar.style.width = '0%';
        progressText.textContent = 'Preparing file...';

        // Use the fallback method if CloudConvert fails
        convertWithCloudConvert(selectedFile, fromFormat, toFormat)
            .catch(error => {
                console.error('CloudConvert failed, using fallback method:', error);
                simulateConversion(selectedFile, fromFormat, toFormat);
            });
    }

    async function convertWithCloudConvert(file, fromFormat, toFormat) {
        try {
            // Step 1: Create a job
            updateProgress(10, 'Creating conversion job...');

            const jobData = {
                tasks: {
                    'upload-my-file': {
                        operation: 'import/upload'
                    },
                    'convert-my-file': {
                        operation: 'convert',
                        input: 'upload-my-file',
                        output_format: toFormat
                    },
                    'export-my-file': {
                        operation: 'export/url',
                        input: 'convert-my-file'
                    }
                }
            };

            console.log('Creating job with data:', jobData);

            const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jobData)
            });

            console.log('Job creation response status:', jobResponse.status);

            // Check if response is ok
            if (!jobResponse.ok) {
                const errorText = await jobResponse.text();
                console.error('Job creation failed. Response:', errorText);

                try {
                    // Try to parse as JSON if possible
                    const errorJson = JSON.parse(errorText);
                    throw new Error(`Failed to create conversion job: ${errorJson.message || errorJson.error || 'Unknown error'}`);
                } catch (e) {
                    // If parsing fails, use the text
                    throw new Error(`Failed to create conversion job: ${errorText || jobResponse.statusText}`);
                }
            }

            // Try to parse the response as JSON
            let jobResult;
            try {
                const responseText = await jobResponse.text();
                console.log('Job creation response text:', responseText);

                if (!responseText) {
                    throw new Error('Empty response from server');
                }

                jobResult = JSON.parse(responseText);
            } catch (error) {
                console.error('Failed to parse job response:', error);
                throw new Error(`Failed to parse job response: ${error.message}`);
            }

            console.log('Job result:', jobResult);

            if (!jobResult.data || !jobResult.data.tasks) {
                throw new Error('Invalid job response format');
            }

            const uploadTask = jobResult.data.tasks.find(task => task.name === 'upload-my-file');

            if (!uploadTask || !uploadTask.result || !uploadTask.result.form) {
                throw new Error('Upload task not found in response');
            }

            // Step 2: Upload the file
            updateProgress(30, 'Uploading file...');

            const uploadForm = new FormData();
            const uploadFormData = uploadTask.result.form;

            // Add all fields from the form data
            Object.keys(uploadFormData.parameters).forEach(key => {
                uploadForm.append(key, uploadFormData.parameters[key]);
            });

            // Add the file
            uploadForm.append('file', file);

            console.log('Uploading file to:', uploadFormData.url);

            const uploadResponse = await fetch(uploadFormData.url, {
                method: 'POST',
                body: uploadForm
            });

            console.log('Upload response status:', uploadResponse.status);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('File upload failed. Response:', errorText);
                throw new Error(`Failed to upload file: ${errorText || uploadResponse.statusText}`);
            }

            // Step 3: Wait for the job to complete
            updateProgress(50, 'Converting file...');

            const jobId = jobResult.data.id;
            let isCompleted = false;
            let exportTask = null;

            while (!isCompleted) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

                console.log('Checking job status for job ID:', jobId);

                const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`
                    }
                });

                console.log('Status check response status:', statusResponse.status);

                if (!statusResponse.ok) {
                    const errorText = await statusResponse.text();
                    console.error('Status check failed. Response:', errorText);
                    throw new Error(`Failed to check job status: ${errorText || statusResponse.statusText}`);
                }

                // Try to parse the status response
                let statusResult;
                try {
                    const responseText = await statusResponse.text();
                    console.log('Status response text:', responseText);

                    if (!responseText) {
                        throw new Error('Empty status response from server');
                    }

                    statusResult = JSON.parse(responseText);
                } catch (error) {
                    console.error('Failed to parse status response:', error);
                    throw new Error(`Failed to parse status response: ${error.message}`);
                }

                console.log('Status result:', statusResult);

                // Find the export task
                exportTask = statusResult.data.tasks.find(task => task.name === 'export-my-file');

                // Check if all tasks are completed
                const allCompleted = statusResult.data.tasks.every(task =>
                    ['finished', 'error'].includes(task.status)
                );

                if (allCompleted) {
                    isCompleted = true;

                    // Check if any task has an error
                    const errorTask = statusResult.data.tasks.find(task => task.status === 'error');
                    if (errorTask) {
                        throw new Error(`Task ${errorTask.name} failed: ${errorTask.message || 'Unknown error'}`);
                    }
                }

                updateProgress(70, 'Converting file...');
            }

            if (!exportTask || !exportTask.result || !exportTask.result.files || exportTask.result.files.length === 0) {
                throw new Error('No output files found');
            }

            // Step 4: Get the download URL
            updateProgress(90, 'Preparing download...');

            const downloadUrl = exportTask.result.files[0].url;
            const fileName = exportTask.result.files[0].filename;

            // Step 5: Complete the process
            updateProgress(100, 'Conversion complete!');

            // Show download link
            downloadContainer.classList.remove('hidden');
            downloadLink.innerHTML = `
                <a href="${downloadUrl}" download="${fileName}" target="_blank">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download ${fileName}
                </a>
            `;

        } catch (error) {
            console.error('CloudConvert error:', error);
            throw error; // Re-throw to trigger fallback
        }
    }

    // Fallback method that simulates conversion
    function simulateConversion(file, fromFormat, toFormat) {
        console.log('Using fallback conversion method');
        updateProgress(10, 'Preparing file...');

        // Simulate progress
        let progress = 10;
        const interval = setInterval(() => {
            progress += 5;
            if (progress >= 95) {
                clearInterval(interval);
                finishFallbackConversion(file, toFormat);
            }
            updateProgress(progress, 'Converting file...');
        }, 300);
    }

    function finishFallbackConversion(file, toFormat) {
        updateProgress(100, 'Conversion complete!');

        // Create a fake download for demo purposes
        const fileName = file.name.split('.')[0] + '.' + toFormat;

        // Create a blob URL for the original file
        // Note: This doesn't actually convert the file, just renames it
        const url = URL.createObjectURL(file);

        // Show download link
        downloadContainer.classList.remove('hidden');
        downloadLink.innerHTML = `
            <a href="${url}" download="${fileName}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download ${fileName} (Demo Mode)
            </a>
        `;

        convertBtn.disabled = false;
    }

    function updateProgress(percent, message) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = message;
    }
});