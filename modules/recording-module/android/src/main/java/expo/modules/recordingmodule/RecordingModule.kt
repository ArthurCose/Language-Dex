package expo.modules.recordingmodule

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlin.math.min

import android.media.audiofx.NoiseSuppressor

class RecordingModule : Module() {
  private lateinit var audioManager: AudioManager
  private val recorders = mutableMapOf<String, AudioRecorder>()

  override fun definition() = ModuleDefinition {
    Name("RecordingModule")

    Class(AudioRecorder::class) {
      Constructor { options: RecordingOptions ->
        val recorder = AudioRecorder(
          appContext.throwingActivity.applicationContext,
          appContext,
          options
        )
        recorders[recorder.id] = recorder
        recorder
      }

      Property("id") { ref ->
        ref.id
      }

      Property("uri") { ref ->
        ref.uri
      }

      Property("isRecording") { ref ->
        ref.isRecording
      }

      Property("currentTime") { ref ->
        ref.uptime
      }

      AsyncFunction("prepareToRecordAsync") { ref: AudioRecorder, options: RecordingOptions? ->
        checkRecordingPermission()
        ref.prepareRecording(options)
      }

      Function("record") { ref: AudioRecorder ->
        checkRecordingPermission()
        ref.record()
      }

      Function("pause") { ref: AudioRecorder ->
        checkRecordingPermission()
        ref.pauseRecording()
      }

      AsyncFunction("stop") { ref: AudioRecorder ->
        checkRecordingPermission()
        ref.stopRecording()
      }

      Function("getStatus") { ref: AudioRecorder ->
        ref.getAudioRecorderStatus()
      }

      AsyncFunction("getCurrentInput") { ref: AudioRecorder ->
        ref.getCurrentInput(audioManager)
      }

      Function("getAvailableInputs") { ref: AudioRecorder ->
        return@Function ref.getAvailableInputs(audioManager)
      }

      Function("setInput") { ref: AudioRecorder, input: String ->
        ref.setInput(input, audioManager)
      }
    }
  }
  
  private fun checkRecordingPermission() {
    val permission = ContextCompat.checkSelfPermission(appContext.throwingActivity.applicationContext, Manifest.permission.RECORD_AUDIO)
    if (permission != PackageManager.PERMISSION_GRANTED) {
      throw AudioPermissionsException()
    }
  }
}
