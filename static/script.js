document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNamePreview = document.getElementById('fileNamePreview');
    const fromFormat = document.getElementById('fromFormat');
    const toFormat = document.getElementById('toFormat');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const downloadContainer = document.getElementById('downloadContainer');
    const downloadLink = document.getElementById('downloadLink');
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const closeModal = document.querySelector('.close-modal');
    const darkModeToggleDesktop = document.getElementById('darkModeToggleDesktop');
    const darkModeToggleMobile = document.getElementById('darkModeToggleMobile');
    const darkModeIconDesktop = document.getElementById('darkModeIconDesktop');
    const darkModeIconMobile = document.getElementById('darkModeIconMobile');
    const toast = document.getElementById('toast');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storageKey = 'free2format-darkmode';

    // Helper: set icon for both toggles
    function setIcon(isDark) {
        [darkModeIconDesktop, darkModeIconMobile].forEach(icon => {
            if (!icon) return;
            if (isDark) {
                icon.classList.remove('fa-moon', 'fa-regular');
                icon.classList.add('fa-sun', 'fa-solid');
            } else {
                icon.classList.remove('fa-sun', 'fa-solid');
                icon.classList.add('fa-moon', 'fa-regular');
            }
        });
    }

    // Helper: set mode
    function setDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        setIcon(isDark);
    }

    // Initial mode
    let dark = localStorage.getItem(storageKey);
    if (dark === null) dark = prefersDark ? '1' : '0';
    setDarkMode(dark === '1');

    // Toggle on click for both toggles
    [darkModeToggleDesktop, darkModeToggleMobile].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('click', function () {
                const isDark = !document.body.classList.contains('dark-mode');
                setDarkMode(isDark);
                localStorage.setItem(storageKey, isDark ? '1' : '0');
            });
        }
    });

    // Format mappings (will be fetched from backend)
    let formatCategories = {
        document: ['pdf', 'docx', 'doc', 'rtf', 'txt'],
        image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
        audio: ['mp3', 'wav', 'aac', 'flac', 'ogg'],
        video: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'mp3'] // <-- Add 'mp3' to video output formats
    };

    // Current file
    let currentFile = null;

    // Change these URLs to absolute URLs for backend API
    const API_BASE = "http://localhost:5000/api";

    // Fetch supported formats from backend and initialize options
    fetch(`${API_BASE}/formats`)
        .then(response => response.json())
        .then(formats => {
            formatCategories = formats;
            initializeFormatOptions();
        })
        .catch(error => {
            console.error('Error fetching formats:', error);
            showError('The file conversion service is currently unavailable. Please make sure the backend server is running.');
        });

    // Mobile menu toggle
    hamburger.addEventListener('click', function (e) {
        e.stopPropagation();
        navMenu.classList.toggle('active');
    });

    // Hide nav menu when clicking outside
    document.addEventListener('click', function (e) {
        if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && e.target !== hamburger) {
            navMenu.classList.remove('active');
        }
    });

    // Hide nav menu on scroll
    window.addEventListener('scroll', function () {
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
        }
    });

    // File input change
    fileInput.addEventListener('change', function (e) {
        handleFile(e.target.files[0]);
        if (e.target.files[0]) {
            showToast('File selected: ' + e.target.files[0].name);
        }
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('dragover');
    }

    function unhighlight() {
        dropZone.classList.remove('dragover');
    }

    dropZone.addEventListener('drop', function (e) {
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    // Click on drop zone
    dropZone.addEventListener('click', function (e) {
        // Only trigger file dialog if the click is directly on the dropZone,
        // not on the file input or its label/button inside the dropZone.
        if (
            e.target === fileInput ||
            (e.target.closest && e.target.closest('label') && e.target.closest('label').htmlFor === fileInput.id)
        ) {
            return;
        }
        fileInput.click();
    });

    // Close error modal
    closeModal.addEventListener('click', hideError);

    // Initialize format options
    function initializeFormatOptions() {
        // Clear previous options
        fromFormat.innerHTML = '<option value="">From Format (Auto-detected)</option>';
        // Populate "From Format" dropdown using fetched formatCategories
        for (const [category, formatList] of Object.entries(formatCategories)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category.charAt(0).toUpperCase() + category.slice(1);

            formatList.forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.textContent = format.toUpperCase();
                optgroup.appendChild(option);
            });

            fromFormat.appendChild(optgroup);
        }
    }

    // Handle file selection
    function handleFile(file) {
        if (!file) return;

        currentFile = file;
        fileNamePreview.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;

        // Auto-detect format
        const extension = getFileExtension(file.name).toLowerCase();

        // Safely set the detected input format
        const fromOptions = Array.from(fromFormat.querySelectorAll('option'));
        const matchedOption = fromOptions.find(opt => opt.value.toLowerCase() === extension);

        // Only show error if the backend does not support this input format
        if (matchedOption && matchedOption.value) {
            fromFormat.value = matchedOption.value;
            updateOutputFormats(matchedOption.value);
        } else {
            // Show a more helpful error if PDF is not supported as input
            if (extension === 'pdf') {
                showError('PDF as input is not supported by the backend. Please update your backend to allow PDF as input, or only use PDF as output.');
            } else {
                showToast(`File format ".${extension}" not supported.`);
            }
            convertBtn.disabled = true;
            return;
        }

        // Enable convert button if output format is selected
        convertBtn.disabled = !toFormat.value;
    }

    // Get file extension
    function getFileExtension(filename) {
        return filename.split('.').pop();
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Update output formats based on input format
    function updateOutputFormats(inputFormat) {
        // Clear current options
        toFormat.innerHTML = '<option value="">To Format</option>';

        // Find category of input format
        let category = null;
        for (const [cat, formats] of Object.entries(formatCategories)) {
            if (formats.includes(inputFormat)) {
                category = cat;
                break;
            }
        }

        if (!category) {
            showError(`Unsupported input format: ${inputFormat}`);
            convertBtn.disabled = true;
            return;
        }

        // Add appropriate output formats
        const formats = formatCategories[category];
        formats.forEach(format => {
            if (format !== inputFormat) {
                const option = document.createElement('option');
                option.value = format;

                // Format display names
                let displayName = format.toUpperCase();
                if (format === 'docx') displayName = 'Word (DOCX)';
                if (format === 'pdf') displayName = 'PDF';

                option.textContent = displayName;
                toFormat.appendChild(option);
            }
        });

        // Select first option
        if (toFormat.options.length > 1) {
            toFormat.selectedIndex = 1;
            convertBtn.disabled = false;
        } else {
            convertBtn.disabled = true;
        }
    }

    // To format change
    toFormat.addEventListener('change', function () {
        convertBtn.disabled = !toFormat.value || !currentFile;
    });

    // --- Real-time total conversions counter (polling every 10 seconds) ---
    const conversionCountElem = document.getElementById('conversionCount');
    function updateConversionCount() {
        fetch('http://localhost:5000/api/total-conversions')
            .then(res => res.json())
            .then(data => {
                if (conversionCountElem && typeof data.total === 'number') {
                    conversionCountElem.textContent = data.total.toLocaleString();
                }
            });
    }
    if (conversionCountElem) {
        updateConversionCount();
        setInterval(updateConversionCount, 10000);
    }

    // Add custom popup HTML for MP3 redirect
    const mp3RedirectModal = document.createElement('div');
    mp3RedirectModal.id = 'mp3RedirectModal';
    mp3RedirectModal.className = 'modal hidden';
    mp3RedirectModal.innerHTML = `
        <div class="modal-content mp3-modal-content" style="max-width:420px; padding:32px 28px 28px 28px; border-radius:18px; box-shadow:0 8px 32px rgba(0,0,0,0.18); text-align:center; position:relative;">
            <span class="close-modal" id="closeMp3RedirectModal" style="position:absolute;top:18px;right:18px;font-size:22px;cursor:pointer;color:#888;">&times;</span>
            <div style="margin-bottom:18px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin-bottom:8px;">
                    <circle cx="12" cy="12" r="12" fill="#9B59FF" opacity="0.12"/>
                    <path d="M8 17v-2a4 4 0 0 1 8 0v2" stroke="#9B59FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="9" r="3" stroke="#9B59FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h2 class="mp3-modal-title" style="font-size:1.35rem; font-weight:700; margin-bottom:10px; color:#2d2d2d;">Redirect to MP3 Converter</h2>
            <p class="mp3-modal-desc" style="font-size:1.05rem; color:#444; margin-bottom:22px;">
                You are about to visit our dedicated MP3 converter website.<br>
                Would you like to continue?
            </p>
            <div style="display:flex; justify-content:center; gap:16px;">
                <button id="mp3RedirectCancelBtn" class="modal-btn" style="padding:10px 26px; border-radius:6px; border:none; background:#f2f2f2; color:#444; font-weight:500; font-size:1rem; transition:background 0.2s; cursor:pointer;">Cancel</button>
                <button id="mp3RedirectGoBtn" class="modal-btn" style="padding:10px 26px; border-radius:6px; border:none; background:#9B59FF; color:#fff; font-weight:600; font-size:1rem; box-shadow:0 2px 8px rgba(155,89,255,0.08); cursor:pointer; transition:background 0.2s;">Go to Website</button>
            </div>
        </div>
    `;
    document.body.appendChild(mp3RedirectModal);

    // --- Add dark mode styling for the modal ---
    function updateMp3ModalTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        const modalContent = mp3RedirectModal.querySelector('.mp3-modal-content');
        const title = mp3RedirectModal.querySelector('.mp3-modal-title');
        const desc = mp3RedirectModal.querySelector('.mp3-modal-desc');
        if (modalContent) {
            modalContent.style.background = isDark ? '#232136' : '#fff';
            modalContent.style.boxShadow = isDark
                ? '0 8px 32px rgba(0,0,0,0.45)'
                : '0 8px 32px rgba(0,0,0,0.18)';
        }
        if (title) title.style.color = isDark ? '#e0e0e0' : '#2d2d2d';
        if (desc) desc.style.color = isDark ? '#bdbdbd' : '#444';
        // Button backgrounds
        const cancelBtn = mp3RedirectModal.querySelector('#mp3RedirectCancelBtn');
        const goBtn = mp3RedirectModal.querySelector('#mp3RedirectGoBtn');
        if (cancelBtn) {
            cancelBtn.style.background = isDark ? '#2d2a40' : '#f2f2f2';
            cancelBtn.style.color = isDark ? '#e0e0e0' : '#444';
            cancelBtn.style.border = isDark ? '1px solid #393552' : 'none';
        }
        if (goBtn) {
            goBtn.style.background = '#9B59FF';
            goBtn.style.color = '#fff';
        }
        // Close icon color
        const closeIcon = mp3RedirectModal.querySelector('#closeMp3RedirectModal');
        if (closeIcon) closeIcon.style.color = isDark ? '#bdbdbd' : '#888';
    }

    // Call on load and on dark mode toggle
    updateMp3ModalTheme();
    [darkModeToggleDesktop, darkModeToggleMobile].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('click', function () {
                setTimeout(updateMp3ModalTheme, 10);
            });
        }
    });

    // Convert button click
    convertBtn.addEventListener('click', function () {
        if (!currentFile || !toFormat.value) {
            showError('Please select a file and conversion format');
            return;
        }

        // Custom logic: If input is mp4 and output is mp3, show custom redirect popup
        const inputExt = getFileExtension(currentFile.name).toLowerCase();
        const outputFormat = toFormat.value.toLowerCase();
        if (inputExt === 'mp4' && outputFormat === 'mp3') {
            mp3RedirectModal.classList.remove('hidden');
            return; // Do not proceed with normal conversion
        }

        // Show progress
        progressContainer.classList.remove('hidden');
        downloadContainer.classList.add('hidden');
        convertBtn.disabled = true;

        // Start conversion
        convertFile(currentFile, toFormat.value);
    });

    // MP3 redirect modal logic
    document.getElementById('closeMp3RedirectModal').onclick = function() {
        mp3RedirectModal.classList.add('hidden');
    };
    document.getElementById('mp3RedirectCancelBtn').onclick = function() {
        mp3RedirectModal.classList.add('hidden');
    };
    document.getElementById('mp3RedirectGoBtn').onclick = function() {
        window.open('https://your-mp3-converter-website.com/', '_blank');
    };

    // File conversion function
    async function convertFile(file, outputFormat) {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            // Use 'to_format' to match Flask backend
            formData.append('to_format', outputFormat);

            // Simulate progress (in a real app, this would be based on actual conversion progress)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                updateProgress(Math.min(progress, 95)); // Max 95% until actual completion

                if (progress >= 95) {
                    clearInterval(progressInterval);
                }
            }, 300);

            // Send conversion request
            const response = await fetch(`${API_BASE}/convert`, {
                method: 'POST',
                body: formData
            });

            // Clear progress interval
            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Conversion failed');
            }

            // Get the blob
            const blob = await response.blob();

            // Complete progress
            updateProgress(100);

            // Create object URL
            const objectUrl = URL.createObjectURL(blob);

            // Get filename from Content-Disposition header or create one
            let filename = '';
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            if (!filename) {
                const originalName = file.name.split('.')[0];
                filename = `${originalName}.${outputFormat}`;
            }

            // Show download link
            downloadLink.innerHTML = `
                <a href="${objectUrl}" download="${filename}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download ${filename}
                </a>
            `;

            downloadContainer.classList.remove('hidden');

            // Show toast for success
            showToast('Conversion successful! Ready to download.');

            // Re-enable convert button
            convertBtn.disabled = false;

        } catch (error) {
            console.error('Conversion error:', error);
            showError(error.message || 'Error during conversion');
            progressContainer.classList.add('hidden');
            convertBtn.disabled = false;
        }
    }

    // Update progress bar
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Converting... ${percent}%`;

        if (percent >= 100) {
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 1000);
        }
    }

    // Show error modal (for critical errors)
    function showError(message) {
        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');
    }

    // Hide error modal
    function hideError() {
        errorModal.classList.add('hidden');
    }

    // Show toast notification (for minor/quick info)
    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // Check if required dependencies are installed
    fetch(`${API_BASE}/check-status`)
        .then(response => response.json())
        .then(status => {
            if (!status.ffmpeg || !status.libreoffice) {
                let missingDeps = [];
                if (!status.ffmpeg) missingDeps.push('FFmpeg');
                if (!status.libreoffice) missingDeps.push('LibreOffice');

                console.warn(`Missing dependencies: ${missingDeps.join(', ')}`);
                // You could show a warning to the user here
            }
        })
        .catch(error => {
            console.error('Error checking dependencies:', error);
            // Optionally show a warning to the user here as well
        });

    // Show like/donation modal after download starts
    const likeDonationModal = document.getElementById('likeDonationModal');
    const closeLikeDonationModal = document.getElementById('closeLikeDonationModal');
    const razorpayDonateBtn = document.getElementById('razorpayDonateBtn');

    if (downloadLink && likeDonationModal) {
        downloadLink.addEventListener('click', function (e) {
            // Let the download start, then show modal after a short delay
            setTimeout(() => {
                likeDonationModal.classList.remove('hidden');
            }, 500);
        });
    }

    if (closeLikeDonationModal) {
        closeLikeDonationModal.addEventListener('click', function () {
            likeDonationModal.classList.add('hidden');
        });
    }

    if (razorpayDonateBtn) {
        razorpayDonateBtn.addEventListener('click', function () {
            var options = {
                "key": "YOUR_RAZORPAY_KEY_ID", // Replace with your Razorpay key
                "amount": 10000, // Amount in paise (10000 = ₹100)
                "currency": "INR",
                "name": "Free2Format",
                "description": "Support Free2Format",
                // "image": "https://yourdomain.com/logo.png",
                "handler": function (response){
                    alert("Thank you for your donation!");
                },
                "theme": {
                    "color": "#9B59FF"
                }
            };
            var rzp1 = new Razorpay(options);
            rzp1.open();
        });
    }

    // Legal modal logic
    const legalModal = document.getElementById('legalModal');
    const closeLegalModal = document.getElementById('closeLegalModal');
    const legalModalTitle = document.getElementById('legalModalTitle');
    const legalModalBody = document.getElementById('legalModalBody');
    document.querySelectorAll('.legal-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            let type = link.getAttribute('data-legal');
            if (type === 'privacy') {
                legalModalTitle.textContent = 'Privacy Policy';
                legalModalBody.innerHTML = `
                    <h4>1. Information We Collect</h4>
                    <p>We do not collect or store any personal information or uploaded files. All file conversions are processed automatically and files are deleted after conversion.</p>
                    <h4>2. Use of Information</h4>
                    <p>Your files are used solely for the purpose of conversion and are not shared with third parties.</p>
                    <h4>3. Data Security</h4>
                    <p>We use industry-standard security measures to protect your data during upload and conversion. Files are deleted from our servers after processing.</p>
                    <h4>4. Changes to Policy</h4>
                    <p>We may update this Privacy Policy from time to time. Please review this page periodically for changes.</p>
                `;
            } else if (type === 'terms') {
                legalModalTitle.textContent = 'Terms of Service';
                legalModalBody.innerHTML = `
                    <h4>1. Acceptance of Terms</h4>
                    <p>By using Free2Format, you agree to these Terms of Service. If you do not agree, please do not use our service.</p>
                    <h4>2. User Responsibilities</h4>
                    <p>You agree not to upload files that are illegal, infringe copyright, or violate any laws. You are solely responsible for the content you upload.</p>
                    <h4>3. Service Availability</h4>
                    <p>We strive to keep the service available, but do not guarantee uninterrupted access. We reserve the right to modify or discontinue the service at any time.</p>
                    <h4>4. Disclaimer</h4>
                    <p>This service is provided "as is" without warranties of any kind. We are not liable for any damages resulting from the use of this service.</p>
                `;
            } else if (type === 'cookie') {
                legalModalTitle.textContent = 'Cookie Policy';
                legalModalBody.innerHTML = `
                    <h4>1. What Are Cookies?</h4>Z
                    <p>Cookies are small text files stored on your device to help the site function properly.</p>
                    <h4>2. How We Use Cookies</h4>
                    <p>We use only essential cookies for site functionality, such as remembering your dark mode preference. We do not use tracking or advertising cookies.</p>
                    <h4>3. Managing Cookies</h4>
                    <p>You can disable cookies in your browser settings, but some features of the site may not work as intended.</p>
                `;
            }
            legalModal.classList.remove('hidden');
        });
    });
    if (closeLegalModal) {
        closeLegalModal.addEventListener('click', function () {
            legalModal.classList.add('hidden');
        });
    }
});