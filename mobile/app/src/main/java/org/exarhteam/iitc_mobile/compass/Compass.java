package org.exarhteam.iitc_mobile.compass;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorManager;

import java.util.ArrayList;

public abstract class Compass
{
    public static Compass getDefaultCompass(final Context context) {
        final SensorManager sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);

        final Sensor rotationVector = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rotationVector != null) {
            return new RotationVectorCompass(context);
        }

        // No compass available on this device
        return null;
    }

    private final ArrayList<CompassListener> mListeners = new ArrayList<CompassListener>();
    private boolean mStarted = false;

    protected abstract void onStart();

    protected abstract void onStop();

    protected void publishOrientation(final float x, final float y, final float z)
    {
        for (final CompassListener listener : mListeners)
            listener.onCompassChanged(x, y, z);
    }

    public void registerListener(final CompassListener listener)
    {
        mListeners.add(listener);
        if (!mStarted)
        {
            onStart();
            mStarted = true;
        }
    }

    public void unregisterListener(final CompassListener listener)
    {
        mListeners.remove(listener);
        if (mListeners.size() == 0)
        {
            onStop();
            mStarted = false;
        }
    }
}
