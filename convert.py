import os
import subprocess
import tempfile
import shutil
import logging
from PIL import Image
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FileConverter:
    def __init__(self):
        """Initialize the converter with a temporary directory"""
        self.temp_dir = tempfile.mkdtemp()
        logger.info(f"Created temporary directory: {self.temp_dir}")
    
    def __del__(self):
        """Clean up temporary directory when the object is destroyed"""
        if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
            logger.info(f"Removed temporary directory: {self.temp_dir}")
    
    def convert(self, input_path, output_format):
        """
        Convert a file to the specified format
        
        Args:
            input_path (str): Path to the input file
            output_format (str): Desired output format (e.g., 'pdf', 'mp3')
            
        Returns:
            str: Path to the converted file
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Get file extension
        input_ext = os.path.splitext(input_path)[1][1:].lower()
        
        # Determine conversion type
        conversion_type = self._get_conversion_type(input_ext)
        if not conversion_type:
            raise ValueError(f"Unsupported input format: {input_ext}")
        
        # Check if output format is supported
        if output_format not in self._get_supported_formats(conversion_type):
            raise ValueError(f"Unsupported output format for {conversion_type}: {output_format}")
        
        # Create output filename
        base_name = os.path.basename(input_path)
        name_without_ext = os.path.splitext(base_name)[0]
        output_file = os.path.join(self.temp_dir, f"{name_without_ext}_{uuid.uuid4().hex[:8]}.{output_format}")
        
        # Perform conversion
        logger.info(f"Converting {input_path} ({input_ext}) to {output_file} ({output_format})")
        
        try:
            if conversion_type == 'document':
                # Special handling for PDF as input
                if input_ext == 'pdf' and output_format == 'txt':
                    self._pdf_to_txt(input_path, output_file)
                elif input_ext == 'pdf' and output_format == 'docx':
                    self._pdf_to_docx(input_path, output_file)
                else:
                    self._convert_document(input_path, output_file, input_ext, output_format)
            elif conversion_type == 'image':
                self._convert_image(input_path, output_file, input_ext, output_format)
            elif conversion_type == 'audio':
                self._convert_audio(input_path, output_file, input_ext, output_format)
            elif conversion_type == 'video':
                self._convert_video(input_path, output_file, input_ext, output_format)
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            raise RuntimeError(f"Conversion failed: {e}")
        
        if not os.path.exists(output_file):
            raise RuntimeError(f"Conversion failed: Output file not created")
        
        return output_file
    
    def _get_conversion_type(self, extension):
        """Determine the type of conversion based on file extension"""
        # ADD 'pdf' to document_formats so PDF is accepted as input
        document_formats = ['pdf', 'docx', 'doc', 'rtf', 'txt']
        image_formats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif']
        audio_formats = ['mp3', 'wav', 'aac', 'flac', 'ogg']
        video_formats = ['mp4', 'avi', 'mov', 'mkv', 'wmv']
        if extension in document_formats:
            return 'document'
        elif extension in image_formats:
            return 'image'
        elif extension in audio_formats:
            return 'audio'
        elif extension in video_formats:
            return 'video'
        return None
    
    def _get_supported_formats(self, conversion_type):
        """Get supported output formats for a given conversion type"""
        if conversion_type == 'document':
            # PDF is only allowed as output, not input
            return ['pdf', 'docx', 'doc', 'rtf', 'txt']
        elif conversion_type == 'image':
            return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
        elif conversion_type == 'audio':
            return ['mp3', 'wav', 'aac', 'flac', 'ogg']
        elif conversion_type == 'video':
            return ['mp4', 'avi', 'mov', 'mkv', 'wmv']
        return []
    
    def _convert_document(self, input_path, output_path, input_ext, output_format):
        """Convert document files using pypandoc"""
        logger.info(f"Converting document from {input_ext} to {output_format}")
        try:
            # Use pypandoc for document conversion (requires Pandoc installed)
            try:
                import pypandoc
                pypandoc.convert_file(input_path, output_format, outputfile=output_path)
            except ImportError:
                raise RuntimeError("pypandoc is not installed. Please install it for document conversion.")
            except OSError as e:
                raise RuntimeError("Pandoc is not installed or not found. Please install Pandoc for document conversion.")
            except Exception as e:
                # Special case for TXT to PDF if pypandoc fails
                if input_ext == 'txt' and output_format == 'pdf':
                    try:
                        from reportlab.pdfgen import canvas
                        from reportlab.lib.pagesizes import letter
                        c = canvas.Canvas(output_path, pagesize=letter)
                        with open(input_path, 'r', encoding='utf-8') as f:
                            text = f.read()
                        y = 750
                        for line in text.split('\n'):
                            if y < 50:
                                c.showPage()
                                y = 750
                            c.drawString(50, y, line)
                            y -= 15
                        c.save()
                    except ImportError:
                        raise RuntimeError("ReportLab is not installed. Please install it for TXT to PDF conversion.")
                    except Exception as e2:
                        raise RuntimeError(f"TXT to PDF conversion failed: {e2}")
                else:
                    raise RuntimeError(f"Document conversion failed: {e}")
        except Exception as e:
            logger.error(f"Document conversion error: {e}")
            raise
    
    def _pdf_to_txt(self, input_path, output_path):
        """Extract text from PDF and save as TXT"""
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(input_path)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
        except ImportError:
            raise RuntimeError("pdfminer.six is not installed. Please install it for PDF to TXT conversion.")
        except Exception as e:
            logger.error(f"PDF to TXT conversion error: {e}")
            raise RuntimeError(f"PDF to TXT conversion failed: {e}")

    def _pdf_to_docx(self, input_path, output_path):
        """Convert PDF to DOCX using pdf2docx"""
        try:
            from pdf2docx import Converter
            cv = Converter(input_path)
            cv.convert(output_path, start=0, end=None)
            cv.close()
        except ImportError:
            raise RuntimeError("pdf2docx is not installed. Please install it for PDF to DOCX conversion.")
        except Exception as e:
            logger.error(f"PDF to DOCX conversion error: {e}")
            raise RuntimeError(f"PDF to DOCX conversion failed: {e}")
    
    def _convert_image(self, input_path, output_path, input_ext, output_format):
        """Convert image files using Pillow"""
        logger.info(f"Converting image from {input_ext} to {output_format}")
        try:
            img = Image.open(input_path)
            if output_format in ['jpg', 'jpeg']:
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
                    img = background
                img.save(output_path, 'JPEG', quality=95)
            elif output_format == 'png':
                img.save(output_path, 'PNG')
            elif output_format == 'gif':
                img.save(output_path, 'GIF')
            elif output_format == 'bmp':
                img.save(output_path, 'BMP')
            elif output_format in ['tiff', 'tif']:
                img.save(output_path, 'TIFF')
            else:
                raise ValueError(f"Unsupported image output format: {output_format}")
        except Exception as e:
            logger.error(f"Image conversion error: {e}")
            raise RuntimeError(f"Image conversion failed: {e}")
    
    def _convert_audio(self, input_path, output_path, input_ext, output_format):
        """Convert audio files using ffmpeg"""
        logger.info(f"Converting audio from {input_ext} to {output_format}")
        if not self._check_command('ffmpeg'):
            raise RuntimeError("ffmpeg is not installed or not in PATH")
        try:
            subprocess.run([
                'ffmpeg', '-y', '-i', input_path, output_path
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            logger.error(f"Audio conversion error: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}")
            raise RuntimeError(f"Audio conversion failed: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}")
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
            raise
    
    def _convert_video(self, input_path, output_path, input_ext, output_format):
        """Convert video files using ffmpeg"""
        logger.info(f"Converting video from {input_ext} to {output_format}")
        if not self._check_command('ffmpeg'):
            raise RuntimeError("ffmpeg is not installed or not in PATH")
        try:
            subprocess.run([
                'ffmpeg', '-y', '-i', input_path, output_path
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            logger.error(f"Video conversion error: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}")
            raise RuntimeError(f"Video conversion failed: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}")
        except Exception as e:
            logger.error(f"Video conversion error: {e}")
            raise
    
    def _check_command(self, command):
        """Check if a command is available"""
        try:
            # Try Windows 'where' first for better Windows compatibility
            if os.name == 'nt':
                with open(os.devnull, 'w') as devnull:
                    subprocess.run(['where', command], check=True, stdout=devnull, stderr=devnull)
                return True
            else:
                with open(os.devnull, 'w') as devnull:
                    subprocess.run(['which', command], check=True, stdout=devnull, stderr=devnull)
                return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False