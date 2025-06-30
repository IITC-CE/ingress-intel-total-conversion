package org.exarhteam.iitc_mobile.compass;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

public class RotationVectorCompass extends Compass {
    private static final long SENSOR_DELAY_CUSTOM = 50_000_000L; // 50ms for smooth updates
    
    private final SensorManager mSensorManager;
    private final Sensor mRotationVectorSensor;
    private final SensorListener mSensorListener = new SensorListener();
    private final float[] mRotationMatrix = new float[9];
    private final float[] mOrientation = new float[3];
    private long mLastUpdate = 0;

    public RotationVectorCompass(final Context context) {
        mSensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        mRotationVectorSensor = mSensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
    }

    @Override
    protected void onStart() {
        if (mRotationVectorSensor != null) {
            mSensorManager.registerListener(mSensorListener, mRotationVectorSensor, 
                SensorManager.SENSOR_DELAY_UI);
        }
    }

    @Override
    protected void onStop() {
        mSensorManager.unregisterListener(mSensorListener);
    }

    private class SensorListener implements SensorEventListener {
        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}

        @Override
        public void onSensorChanged(SensorEvent event) {
            if (event.sensor.getType() == Sensor.TYPE_ROTATION_VECTOR) {
                // Rate limiting
                if ((event.timestamp - mLastUpdate) < SENSOR_DELAY_CUSTOM) {
                    return;
                }
                mLastUpdate = event.timestamp;

                // Convert rotation vector to rotation matrix
                SensorManager.getRotationMatrixFromVector(mRotationMatrix, event.values);
                
                // Get orientation from rotation matrix
                SensorManager.getOrientation(mRotationMatrix, mOrientation);
                
                // Publish orientation (azimuth, pitch, roll)
                publishOrientation(mOrientation[0], mOrientation[1], mOrientation[2]);
            }
        }
    }
}