package org.exarhteam.iitc_mobile;

public class IITC_DebugHistory {
    private int size = 0;
    private int maxSize;
    private String[] stackArray;

    IITC_DebugHistory(int arraySize) {
        maxSize = arraySize;
        stackArray = new String[maxSize];
        for (int i = 0; i < maxSize; i++) stackArray[i] = "";
    }

    public void push(String a) {
        if (maxSize > 0) System.arraycopy(stackArray, 0, stackArray, 1, maxSize - 1);
        stackArray[0] = a;
        if (size < maxSize) size++;
    }

    public String peek(int num) {
        String item = "";
        if (num >= 0 && num < maxSize) {
            item = stackArray[num];
        }
        return item;
    }

    public int getSize() {
        return size;
    }

    public void display() {
        for (int i = 0; i < maxSize; i++) {
            System.out.print(stackArray[i] + " ");
        }
        System.out.println();
    }

    public String[] getStackArray() {

        String[] arr = new String[size];
        if (maxSize > 0) System.arraycopy(stackArray, 0, arr, 0, size);

        return arr;
    }
}
