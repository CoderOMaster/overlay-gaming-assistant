"""
Audio transcription endpoint using OpenAI Whisper API
"""
import os
import tempfile
from flask import request, jsonify
from openai import OpenAI

def transcribe_audio_endpoint():
    """Handle audio transcription requests"""
    
    # Check if audio file is in request
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    
    if audio_file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    try:
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
            audio_file.save(temp_audio.name)
            temp_audio_path = temp_audio.name
        
        print(f"Audio saved to: {temp_audio_path}")
        print(f"File size: {os.path.getsize(temp_audio_path)} bytes")
        
        # Get OpenAI API key
        api_key = os.environ.get('OPENAI_API_KEY')
        
        if not api_key:
            return jsonify({
                'error': 'OpenAI API key not set. Please set OPENAI_API_KEY environment variable.'
            }), 500
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Transcribe audio using Whisper
        print("Transcribing audio with Whisper...")
        
        with open(temp_audio_path, 'rb') as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="en"  # Change to None for auto-detection
            )
        
        transcribed_text = transcript.text
        print(f"Transcription result: {transcribed_text}")
        
        # Clean up temporary file
        try:
            os.unlink(temp_audio_path)
        except:
            pass
        
        return jsonify({
            'success': True,
            'text': transcribed_text,
            'transcription': transcribed_text
        })
    
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        
        # Clean up temp file if it exists
        try:
            if 'temp_audio_path' in locals():
                os.unlink(temp_audio_path)
        except:
            pass
        
        return jsonify({
            'error': f'Transcription failed: {str(e)}'
        }), 500