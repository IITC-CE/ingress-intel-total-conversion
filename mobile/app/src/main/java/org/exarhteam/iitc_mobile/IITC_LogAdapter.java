package org.exarhteam.iitc_mobile;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.PopupMenu;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import org.exarhteam.iitc_mobile.Log.Message;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

public class IITC_LogAdapter extends RecyclerView.Adapter<IITC_LogAdapter.ViewHolder> implements Log.Receiver {
    private final IITC_Mobile mIitc;
    private int mObservers = 0;
    private List<Message> logs = new ArrayList<>();
    private boolean isScrollToEnd = true;
    private int manualPosition = -1;

    IITC_LogAdapter(IITC_Mobile mIitc){
        this.mIitc = mIitc;

        mIitc.debugScrollButton.setOnClickListener(v -> {
            int posId;
            if (manualPosition < 0) {
                posId = getItemCount()-1;
            } else {
                posId = manualPosition;
                manualPosition = -2;
            }
            mIitc.mLvDebug.smoothScrollToPosition(posId);
        });

        mIitc.mLvDebug.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(RecyclerView recyclerView, int dx, int dy) {
                super.onScrolled(recyclerView, dx, dy);

                if (mIitc.isDebugEnd()) {
                    mIitc.debugScrollButton.hide(false);
                    isScrollToEnd = true;
                    manualPosition = -1;
                } else {
                    mIitc.debugScrollButton.show();
                    isScrollToEnd = false;
                    if (manualPosition == -1) {
                        manualPosition = getItemCount()-1;
                    }
                }
            }
        });
    }

    @Override
    public void handle(final Message message) {
        this.mIitc.runOnUiThread(() -> {
            int new_id = getItemCount();
            logs.add(new_id, message);
            notifyItemInserted(new_id);

            if (isScrollToEnd) {
                mIitc.mLvDebug.scrollToPosition(new_id);
            }
        });
    }


    @Override
    public void registerAdapterDataObserver(RecyclerView.AdapterDataObserver dataSetObserver) {
        super.registerAdapterDataObserver(dataSetObserver);
        if (mObservers < 1)
            Log.addReceiver(this);

        mObservers++;
    }

    @Override
    public void unregisterAdapterDataObserver(RecyclerView.AdapterDataObserver dataSetObserver) {
        super.unregisterAdapterDataObserver(dataSetObserver);
        mObservers--;

        if (mObservers < 1) {
            clear();
            Log.removeReceiver(this);
        }
    }

    @Override
    public IITC_LogAdapter.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View rowItem = LayoutInflater.from(parent.getContext()).inflate(viewType == 0 ? R.layout.view_log_msg_odd : R.layout.view_log_msg_even, parent, false);
        return new ViewHolder(rowItem);
    }

    @Override
    public int getItemViewType(int position) {
        return position % 2;
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        final Message item = logs.get(position);

        switch (item.getPriority()) {
            case Log.ASSERT:
            case Log.ERROR:
                holder.icon.setImageResource(R.drawable.ic_action_error_red);
                break;
            case Log.WARN:
                holder.icon.setImageResource(R.drawable.ic_action_warning_yellow);
                break;
            default:
                holder.icon.setImageResource(R.drawable.ic_action_about);
        }

        holder.tag.setText(item.getTag());
        holder.time.setText(item.getDateString());

        String msg = item.getMsg();
        if (item.getTr() != null) {
            final StringWriter sw = new StringWriter();
            final PrintWriter pw = new PrintWriter(sw);
            item.getTr().printStackTrace(pw);

            if (msg == null || msg.isEmpty())
                msg = sw.toString();
            else
                msg += "\n" + sw.toString();
        }

        holder.msg.setText(msg);
    }

    @Override
    public int getItemCount() {
        return this.logs.size();
    }

    public void clear() {
        logs.clear();
        notifyDataSetChanged();
    }


    class ViewHolder extends RecyclerView.ViewHolder {
        private ImageView icon;
        private TextView msg;
        private TextView tag;
        private TextView time;

        ViewHolder(View view) {
            super(view);
            view.setOnLongClickListener(this::onLongClick);
            this.icon = view.findViewById(R.id.log_type);
            this.msg = view.findViewById(R.id.log_msg);
            this.tag = view.findViewById(R.id.log_tag);
            this.time = view.findViewById(R.id.log_time);
        }

        boolean onLongClick(View view) {
            TextView textView = view.findViewById(R.id.log_msg);

            final PopupMenu popupMenu = new PopupMenu(mIitc, view);
            popupMenu.getMenuInflater().inflate(R.menu.debug, popupMenu.getMenu());

            popupMenu.setOnMenuItemClickListener(menuitem -> {
                switch (menuitem.getItemId()) {
                    case R.id.menu_copy:
                        mIitc.clipboardCopy(textView.getText().toString());
                        return true;
                    case R.id.menu_delete:
                        int position = this.getAdapterPosition();
                        logs.remove(position);
                        notifyItemRemoved(position);
                        return true;
                }
                return false;
            });

            popupMenu.show();
            return true;
        }
    }
}
