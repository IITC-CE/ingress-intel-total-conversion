package org.exarhteam.iitc_mobile;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

import static org.junit.Assert.assertEquals;

public class IITC_DebugHistoryTest {

    private final ByteArrayOutputStream outContent = new ByteArrayOutputStream();
    private final PrintStream originalOut = System.out;

    @Before
    public void setUpStreams() {
        System.setOut(new PrintStream(outContent));
    }

    @After
    public void restoreStreams() {
        System.setOut(originalOut);
    }

    @Test
    public void push() {
        IITC_DebugHistory history = new IITC_DebugHistory(5);
        history.push("text1");
        history.push("text2");
        history.push("text3");
        history.push("text4");
        history.push("text5");
        history.push("text6");
    }

    @Test
    public void peek_1() {
        IITC_DebugHistory history = new IITC_DebugHistory(10);
        assertEquals(history.peek(1), "");
        assertEquals(history.peek(0), "");
        assertEquals(history.peek(-1), "");
        assertEquals(history.peek(100), "");
    }

    @Test
    public void peek_2() {
        IITC_DebugHistory history = new IITC_DebugHistory(4);
        history.push("text1");
        history.push("text2");
        history.push("text3");
        assertEquals(history.peek(1), "text2");
        history.push("text4");
        history.push("text5");
        history.push("text6");
        assertEquals(history.peek(1), "text5");
    }

    @Test
    public void display() {
        IITC_DebugHistory history = new IITC_DebugHistory(2);
        history.push("text1");
        history.push("text2");
        history.push("text3");
        history.push("text4");
        history.display();
        assertEquals("text4 text3 \n", outContent.toString());
    }

    @Test
    public void size() {
        IITC_DebugHistory history = new IITC_DebugHistory(4);
        history.push("text1");
        history.push("text2");
        history.push("text3");
        assertEquals(history.getSize(), 3);
        history.push("text4");
        history.push("text5");
        history.push("text6");
        assertEquals(history.getSize(), 4);
    }

    @Test
    public void getStackArray() {
        IITC_DebugHistory history = new IITC_DebugHistory(10);
        history.push("text1");
        history.push("text2");
        history.push("text3");

        String[] expected = {"text3", "text2", "text1"};
        assertEquals(history.getStackArray(), expected);
    }

}