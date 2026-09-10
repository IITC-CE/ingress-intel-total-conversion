package org.exarhteam.iitc_mobile;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.res.ResourcesCompat;

/**
 * One icon of the bundled Material Symbols font, addressed by the same ligature name the
 * userscript uses in its markup, such as "star".
 *
 * Sized as an action icon: a 32dp box with the glyph filling 24dp of it.
 */
public class IITC_IconDrawable extends Drawable {
    /** Stands in for a pane that names no icon, and for a name this font has none for. */
    public static final String DEFAULT_LIGATURE = "extension";

    private static final float BOX_DP = 32f;
    private static final float GLYPH_DP = 24f;

    private static Typeface sTypeface;

    private final String mLigature;
    private final Paint mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final int mSize;
    private final boolean mHasGlyph;

    public IITC_IconDrawable(final Context context, final String ligature, final int color) {
        if (sTypeface == null) {
            sTypeface = ResourcesCompat.getFont(context, R.font.iitc_icons);
        }

        final float density = context.getResources().getDisplayMetrics().density;
        mSize = Math.round(BOX_DP * density);

        mPaint.setTypeface(sTypeface);
        mPaint.setTextSize(GLYPH_DP * density);
        mPaint.setTextAlign(Paint.Align.CENTER);
        mPaint.setColor(color);

        // an icon shapes into a single glyph one em wide, so a name still several characters wide
        // names no icon of this font and gives way to the default one
        mHasGlyph = sTypeface != null;
        mLigature = mHasGlyph && shapesToOneGlyph(ligature) ? ligature : DEFAULT_LIGATURE;
    }

    private boolean shapesToOneGlyph(final String name) {
        return mPaint.measureText(name) <= mPaint.getTextSize() * 1.5f;
    }

    @Override
    public int getIntrinsicWidth() {
        return mSize;
    }

    @Override
    public int getIntrinsicHeight() {
        return mSize;
    }

    @Override
    public void draw(@NonNull final Canvas canvas) {
        if (!mHasGlyph) return;

        final Rect bounds = getBounds();
        final Paint.FontMetrics metrics = mPaint.getFontMetrics();
        final float baseline = bounds.exactCenterY() - (metrics.ascent + metrics.descent) / 2f;
        canvas.drawText(mLigature, bounds.exactCenterX(), baseline, mPaint);
    }

    @Override
    public void setAlpha(final int alpha) {
        mPaint.setAlpha(alpha);
        invalidateSelf();
    }

    @Override
    public void setColorFilter(@Nullable final ColorFilter colorFilter) {
        mPaint.setColorFilter(colorFilter);
        invalidateSelf();
    }

    @Override
    public int getOpacity() {
        return PixelFormat.TRANSLUCENT;
    }
}
