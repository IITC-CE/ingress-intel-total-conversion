package org.exarhteam.iitc_mobile.fragments;

import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import org.exarhteam.iitc_mobile.IntroActivity;
import org.exarhteam.iitc_mobile.R;
import org.jetbrains.annotations.NotNull;

import java.util.Locale;

public class IntroSlide extends Fragment {
    private static final String ARG_LAYOUT_RES_ID = "layoutResId";
    private int layoutResId;

    public static IntroSlide newInstance(int layoutResId) {
        IntroSlide IntroSlide = new IntroSlide();

        Bundle args = new Bundle();
        args.putInt(ARG_LAYOUT_RES_ID, layoutResId);
        IntroSlide.setArguments(args);

        return IntroSlide;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getArguments() != null && getArguments().containsKey(ARG_LAYOUT_RES_ID)) {
            layoutResId = getArguments().getInt(ARG_LAYOUT_RES_ID);
        }
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(layoutResId, container, false);
    }

    @Override
    public void onViewCreated(@NotNull View view, Bundle savedInstanceState) {
        View btn = getView().findViewById(R.id.appintro_welcome_change_language);
        if (btn == null) return;

        if (((IntroActivity)getActivity()).getCurrentLanguage().equals(Locale.ENGLISH)) {
            btn.setVisibility(View.INVISIBLE);
        } else {
            btn.setOnClickListener( (View v) -> ((IntroActivity)getActivity()).setEnglishLocale() );
        }
    }
}