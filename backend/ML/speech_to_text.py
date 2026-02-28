import assemblyai as aai
import requests
import threading
import logging
from assemblyai.streaming.v3 import (
    StreamingClient, StreamingClientOptions, StreamingEvents, StreamingParameters
)

# Configuration and logging
API_KEY = "e373581f0e0040228322b8cdf5a2a2ae"
aai.settings.api_key = API_KEY


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Global state management
full_transcript = []
silence_timer = None
SILENCE_TIMEOUT = 5
encounter_id = None  


def create_encounter():
    """
    Initializes a new medical encounter in the database via the Node.js API.
    """

    global encounter_id
    try:

        # Define the participants for this session
        payload = {
            "nurse_id": "REPLACE_VALID_NURSE_ID", 
            "patient_id": "VoiceCapturePatient"
        }

        # Attemot to create the entry in the primary database
        response = requests.post("http://localhost:5001/api/encounters", json=payload, timeout=5)
        response.raise_for_status()
        encounter_id = response.json()["_id"]
        logger.info(f"Created encounter with ID: {encounter_id}")

    except Exception as e:

        # Fallback to a local ID if the server is unreadable
        from bson import ObjectId
        encounter_id = str(ObjectId())
        logger.warning(f"Encounter creation failed, using fallback ObjectId. Error: {e}")
        logger.info(f"Using encounter_id: {encounter_id}")


def send_full_transcript():
    """
    Aggregates all transcript segments and sends them to the backend for triage processing.
    """

    if not full_transcript:
        return

    # Ensure we have a database record to attatch this transcript to
    if not encounter_id:
        create_encounter()

    # Join list of sentences into one coherent paragraph
    final_text = " ".join(full_transcript)
    payload = {
        "encounter_id": encounter_id,
        "transcript": final_text,
        "nurse_note": "Voice Capture"
    }

    try:

        # Send data to the interaction log for storage and AI analysis
        response = requests.post("http://localhost:5001/api/interactions/log", json=payload, timeout=10)
        logger.info(f"Backend status: {response.status_code}")
        logger.info(f"Response: {response.json()}")
    except Exception as e:
        logger.error(f"Backend connection error: {e}")


def reset_silence_timer():
    """
    Restarts the countdown timer. If no one speaks for 5 seconds, send_full_transcript is called.
    """

    global silence_timer

    # Stop the previous timer if it exists
    if silence_timer:
        silence_timer.cancel()

    # Start a new 5-seond countdown on a sperate thread
    silence_timer = threading.Timer(SILENCE_TIMEOUT, send_full_transcript)
    silence_timer.start()


def begin(client, event):
    """
    Callback triggered when the AssemblyAI streaming session successfully opens.
    
    :param client: The streaming client instance.
    :param event: Event object containing session ID.
    """

    logger.info(f"Begin: {event.id}")


def turn(client, event):
    """
    Processes incoming speech segments and detects when a speaker has finished a sentence.
    
    :param client: The streaming client instance.
    :param event: Object containing the transcribed text and turn status.
    """

    logger.info(f"Turn: {event.transcript}")

    # Assembly AI 'end_of_turn' identifies a natural pause in speech
    if event.end_of_turn:
        logger.info(f"Final Turn: {event.transcript}")
        full_transcript.append(event.transcript)

        # Refresh timer -> Only send to backend after the user stops completely
        reset_silence_timer()


def error_handling(client, error):
    """
    Logs any errors occurring during the live audio stream.
    
    :param client: The streaming client instance.
    :param error: The error message or exception object.
    """

    logger.error(f"Streaming error: {error}")


def main():
    """
    Main entry point: Sets up the microphone stream and connects to AssemblyAI.
    """

    # Configure the streaming client with the API
    client = StreamingClient(StreamingClientOptions(api_key=API_KEY))

    # Register event listeners for the transcription lifecycle
    client.on(StreamingEvents.Begin, begin)
    client.on(StreamingEvents.Turn, turn)
    client.on(StreamingEvents.Error, error_handling)

    # Establish connection with 16kHz audio sample rate
    client.connect(StreamingParameters(sample_rate=16000, format_turns=True))

    logger.info("Listening to mic...")

    try:
        # Open local microphone and start piping data to the cloud
        client.stream(aai.extras.MicrophoneStream(sample_rate=16000))
    finally:
        # Ensure connection is closed cleanly on exit
        client.disconnect(terminate=True)


if __name__ == "__main__":
    main()