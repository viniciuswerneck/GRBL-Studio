# COMGO Z1 LaserGRBL Manual Transcribed Data & Documentation

This document serves as an exhaustive Markdown transcription and structured representation of the **COMGO Z1 Laser Engraver User Manual V1.1 (LaserGRBL Beginner's Guide)** published by Comgrow. It is optimized for AI consumption, Retrieval-Augmented Generation (RAG) pipelines, and technical analysis.

---

## Document Metadata
- **Manufacturer / Brand:** COMGROW (Enhancing Your Imagination)
- **Product Name:** COMGO Z1 Laser Engraver
- **Guide Title:** COMGO Z1 LaserGRBL Beginner's Guide / User Manual
- **Document Version:** V1.1
- **Primary Control Software Covered:** LaserGRBL (with references to LightBurn)

---

## 1. Introduction & Company Overview

### Welcome Message
> "Dear Customers,
> Thank you for choosing the COMGO Z1 Laser Engraver!
> The COMGO Z1 Laser Engraver is a desktop laser engraver. Before operating the COMGO Z1 Laser Engraver, please read the manual carefully and follow the instructions for assembly and operation. If this manual does not effectively solve your problem, please contact our support team."

### About Comgrow
- **Founded:** 2017
- **Headquarters:** Shenzhen, Southern China
- **Mission:** Making digital manufacturing processes accessible, giving educators, engineers, manufacturers, small businesses, and tinkerers the power to make anything.
- **Scope:** 3D printing, laser cutting, and CNC milling solutions.
- **Customer Support Availability:** Monday through Saturday.

---

## 2. Table of Contents (Catalogs)

1. Technical Parameters (Page 01 / Doc Page 3)
2. Disclaimer (Page 02 / Doc Page 4)
3. Install LaserGRBL (Page 03 / Doc Page 5)
4. Connect COMGO Z1 Laser Engraver (Page 04 / Doc Page 6)
5. Reset Procedure (Page 05 / Doc Page 7)
6. Import Images (Page 06 / Doc Page 8)
7. Setting Parameters (Page 07-08 / Doc Pages 9-10)
8. Start Engraving (Page 09-10 / Doc Pages 11-12)
9. Engraving Parameters Tables (Page 11-12 / Doc Pages 13-14)
10. Introduction of LaserGRBL Interface & Buttons (Page 13 / Doc Page 15)
11. Troubleshooting (Page 14-15 / Doc Pages 16-17)

---

## 3. Technical Parameters & Focus Setup

### 3.1 Hardware Specifications

| Parameter | Specification / Value |
| :--- | :--- |
| **Machine Size** | $575 \times 575 \times 205\text{ mm}$ ($22.64 \times 22.64 \times 8.07\text{ inches}$) |
| **Working Area** | $400 \times 400\text{ mm}$ ($15.75 \times 15.75\text{ inches}$) |
| **Machine Weight** | $5.0\text{ kg}$ ($11\text{ lbs}$) |
| **Frame Material** | Aluminum |
| **Stepper Motor** | $42\text{ mm} \times 42\text{ mm} \times 34\text{ mm}$ (NEMA 17 standard profile) |
| **Laser Module Type** | Diode Lasers |
| **Laser Wavelength** | $445\text{ nm}$ |
| **Laser Output Power Options** | $1.6\text{ W}$, $5\text{ W}$, $10\text{ W}$ |
| **Engraving Accuracy** | $0.1\text{ mm}$ |
| **Laser Spot Size** | Square spot of $0.08\text{ mm}$ |
| **S-Value Range** | S0 - S1000 ($0\% - 100\%$) |
| **Input Voltage** | AC $110\text{ V} - 230\text{ V}$ |
| **Connection Method** | USB Cable |
| **Compatible Software** | LaserGRBL, LightBurn |
| **OS Compatibility (LaserGRBL)** | Windows XP, Windows 7, Windows 8, Windows 10 |
| **OS Compatibility (LightBurn)** | Windows, macOS, Linux |

### 3.2 Focal Length Specifications

> **Definition:** The focal length is defined as the distance from the **lower face of the laser module profile (housing bottom)** to the **engraving target plane**.

| Laser Power Rating | Focal Length | Focus Distance Adjustment Standard |
| :--- | :--- | :--- |
| **1.6W Module** | $30\text{ mm} - 100\text{ mm}$ | Variable |
| **5W Module** | $23\text{ mm}$ | Set distance to target plane using $12\text{ mm} / 20\text{ mm}$ focus block reference |
| **10W Module** | $45\text{ mm}$ | Distance shield to material surface: $7\text{ mm}$ gap bottom-clearance |

---

## 4. Software Installation & Connection Setup

### 4.1 Prerequisites & Disclaimer
1. **LaserGRBL Compatibility:** Open-source software natively supporting Windows Systems ($Win\ XP / Win\ 7 / Win\ 8 / Win\ 10$).
2. **Real-time Operating Requirement:** The COMGO Z1 requires real-time movement commands sent from the host computer over USB. 
   - The host computer **must stay connected**.
   - The controlling software (**LaserGRBL** or **LightBurn**) **must not be closed** during active operation.
   - Host computer system performance can impact engraving speed and quality.
3. **Power Management Advisory:** It is strictly recommended to set the host computer's system power management mode to **"Never Sleep"** to prevent execution interruption.

### 4.2 LaserGRBL Installation Procedure
1. Locate installer packages in machine bundled memory or download from official source: [http://lasergrbl.com/download/](http://lasergrbl.com/download/).
2. Run `Install.exe` / double click setup installer.
3. Choose installation target path (Default target directory: `C:\Program Files\LightBurn` or `C:\Program Files (x86)\LaserGRBL`). Select **Next**.
4. Check **"Create a desktop shortcut"** option. Select **Next**.
5. Click **Finish** to complete installation and launch LaserGRBL.

### 4.3 Connecting Hardware to Software
1. Connect COMGO Z1 Engraver to host PC via provided USB cable and power on external AC supply.
2. Select COM Port and Baud Rate:
   - **Baud Rate:** Set strictly to `115200`.
   - **COM Port Selection:** Usually auto-detected. If multiple serial devices are connected, identify the specific COM port under Windows **Device Manager**.
   - *Note:* Multiple instances of LaserGRBL can run simultaneously on a single PC to control distinct machines, provided each instance routes to its respective COM Port.

#### Driver Installation (CH340)
If the device COM port fails to display:
1. Navigate to main menu: `Tools` $\rightarrow$ `Install CH340 Driver`.
2. Alternatively, run `CH340SER.EXE` located under driver directory folders (`Driver Files/Win/CH340SER.EXE`).
3. Execute installation wizard (`Driver Setup` dialog $\rightarrow$ Click `安装` / `Install`).

---

## 5. System Initialization & Reset Procedure

### Connection & Console Output Verification
Upon selecting the target COM port and clicking the **Connect** button (plug icon):
1. The terminal console will display hardware initialization strings:
   ```text
   Grbl 1.1f ['$' for help]
   COMGO V2.0 ['$' for help]
   [MSG:Check Limits]
   [MSG:'$H'|'$X' to unlock]
   ```
2. **Key Action Controls:**
   - **Button 1 (Connect):** Establishes serial connection over selected COM port at 115200 baud.
   - **Console Output (2):** Displays controller firmware identification (e.g., `COMGO V2.0`).
   - **Button 3 (Reset / Lightning Bolt):** Soft reset command to restore controller state from locks or alarms.

---

## 6. Image Importing & Vector Processing

### Step 1: Loading Image File
- Click `File` $\rightarrow$ `Open File` (or shortcut load) to select target bitmap/vector image.

### Step 2: Parameter Adjustment Sub-panels

#### Panel 1: Image Parameters
- **Resize Algorithm:** Smooth (HQ Bicubic), Nearest Neighbor, etc.
- **Sliders:**
  - **Brightness:** Adjust overall exposure level.
  - **Contrast:** Adjust distinction between dark and light tones.
  - **White Clip:** Eliminates background noise by clipping bright grays to white ($FFFFFF$).
  - **B&W Checkbox:** Converts color spaces to pure black/white threshold.

#### Panel 2: Conversion Tool Modes
- **Line To Line Tracing:** Scans raster images line-by-line using variable laser intensity (ideal for photos/shading).
- **1bit BW Dithering:** Converts shades to dense dot patterns (ideal for detailed photo engraving on wood/metal).
- **Vectorize!:** Converts raster lines into sharp vector paths (ideal for cutting or line art).
- **Centerline:** Traces center paths of thick lines for single-stroke outline marking.
- **Passthrough:** Sends pre-processed raster dots directly without additional re-sampling.

#### Panel 3: Line To Line Options
- **Direction:** Horizontal, Vertical, Diagonal.
- **Quality:** Defines resolution in lines/mm.
  - *COMGO Z1 Optical Spot Reference:* $0.08\text{ mm}$ spot size.
  - *Recommended Quality Value:* **8 to 20 lines/mm** (Standard baseline: **12 lines/mm**).

#### Panel 4 & 5: Transform Tools & Progression
- **Transform Bar (Bottom Controls):** Rotate 90°, Flip Horizontal, Flip Vertical, Crop tool, Invert Colors.
- Select **Next** to proceed to target image speed, power, and dimensional sizing configurations.

---

## 7. Target Image Configuration & Laser Modes

### Speed, Power, and Machine Envelope Settings

1. **Engraving Speed:**
   - **Recommended Range:** `100 - 5000 mm/min`.
   - Higher speeds reduce execution time but may lower depth/contrast. Lower speeds increase depth and heat transfer.
2. **Laser Modes (M3 vs M4):**
   - **M3 (Constant Laser Power Mode):** Laser output power remains constant regardless of movement speed changes. Recommended for **Vector Cutting**, **Centerline**, and standard line modes.
   - **M4 (Dynamic Laser Power Mode):** Laser power automatically adjusts relative to real-time machine acceleration and velocity. Recommended for **1bit BW Dithering** and **Line To Line Tracing** to avoid burnt corners/edges during directional shifts.
3. **Power Output (S-Value):**
   - **S-MIN:** $0$ ($0\%$)
   - **S-MAX:** $1000$ ($100\%$)
4. **Target Dimension & Positioning:**
   - **Width & Height:** Input desired dimensions in millimeters.
   - **Offset X / Y:** Define origin positioning offset.
   - **Critical Work Envelope Rule:** Ensure combined dimensions **do not exceed $400 \times 400\text{ mm}$**.
5. **Pre-configured Material Profiles:**
   - Users can select the configuration popup menu: `Laser Model` (e.g., `Comgo Z1 5W` / `10W`) $\rightarrow$ `Material` $\rightarrow$ `Action` (Engrave/Cut). The software populates recommended power percentage, speed ($\text{mm/min}$), and pass count.

---

## 8. Engraving Execution & Mid-Operation Controls

### 8.1 Starting a Job Workflow
1. Manually position laser module head to desired physical starting location on the workpiece.
2. Click **Reset Button** (Lightning bolt icon) in control pane.
3. Click **Unlock Button** (Padlock icon) to clear `[MSG: Alarm / Lock]` status.
4. Click **Start Button** (Green play arrow) to initiate path execution.

```
[ Manual Laser Head Positioning ]
               │
               ▼
   [ Click Reset ($X) ]
               │
               ▼
  [ Click Unlock ($H/$X) ]
               │
               ▼
[ Click Green Play Button ] ──► (Job Execution Initiated)
```

### 8.2 Pause, Emergency Stop & Resuming Interrupted Jobs

#### Emergency Stop Procedure
- Immediate halt: Click **Reset / Pause** button. Hardware stops execution immediately.

#### Resuming Interrupted / Stopped Jobs
If a job is interrupted (e.g., manual reset triggered, power blip), LaserGRBL prompts with the **Resume Job** window:
- **Option 1: Start again from beginning [safe]** (Restarts G-code at line 1).
- **Option 2: Resume some lines before the stop** (Recommended to allow laser re-ignition overlap, e.g., rewind 100-200 lines).
- **Option 3: Resume from last command sent**.
- **Option 4: Resume from specific line** (Specify line number manually).
- *Requirement:* Ensure workpiece and frame position **remain completely unchanged** before resuming.

#### Real-time Overrides During Engraving
Located at bottom-right status bar during active run:
- **Power Override Slider ($S$):** Adjust relative laser power scale ($1.00\times \pm$).
- **Linear Feedrate Override Slider ($G1$):** Adjust processing feedrate speed ($1.00\times \pm$).
- **Rapid Traverse Override Slider ($G0$):** Adjust non-engraving travel move speeds.

---

## 9. Comprehensive Material Engraving & Cutting Parameters Matrix

### 9.1 Module: 5W Laser Module Specifications

| Execution Mode | Material Type | Power (%) | Speed (mm/min) | Special Notes & Surface Preparation |
| :--- | :--- | :---: | :---: | :--- |
| **Engraving** | Wood Board | $100\%$ | $2500$ | Standard settings |
| **Engraving** | Bamboo | $100\%$ | $2500$ | Standard settings |
| **Engraving** | Solid Wood | $100\%$ | $2500$ | Standard settings |
| **Engraving** | Leather | $100\%$ | $2000$ | Ensure flat material clamping |
| **Engraving** | Glass | $100\%$ | $700$ | Surface MUST be painted black or covered with heat transfer paper |
| **Engraving** | Ceramic | $100\%$ | $700$ | Surface MUST have heat transfer paper applied |
| **Engraving** | Acrylic | $100\%$ | $1500$ | Transparent acrylic requires back/surface painted black |
| **Engraving** | Stainless Steel | $100\%$ | $300$ | Direct marking on raw stainless surface |
| **Engraving** | Anodized Metal | $100\%$ | $800$ | Direct removal of anodized coating |
| **Engraving** | Fabric | $40\%$ | $5000$ | Lower power prevents burning edge frays |
| **Cutting** | $2\text{ mm}$ Thick Board | $100\%$ | $180$ | Pass: 1 pass |
| **Cutting** | $3\text{ mm}$ Thick Board | $100\%$ | $120$ | Pass: 1 pass |
| **Cutting** | $4\text{ mm}$ Thick Board | $100\%$ | $90$ | Reduce focal length slightly into material depth |
| **Cutting** | Cardboard | $100\%$ | $1500$ | Pass: 1 pass |
| **Cutting** | Leather | $100\%$ | $100$ | Pass: 1 pass |
| **Cutting** | Fabric | $100\%$ | $1500$ | Pass: 1 pass |

---

### 9.2 Module: 10W Laser Module Specifications

| Execution Mode | Material Type | Power (%) | Speed (mm/min) | Special Notes & Surface Preparation |
| :--- | :--- | :---: | :---: | :--- |
| **Engraving** | Wood Board | $100\%$ | $5000$ | High-speed processing |
| **Engraving** | Bamboo | $100\%$ | $5000$ | High-speed processing |
| **Engraving** | Solid Wood | $100\%$ | $5000$ | High-speed processing |
| **Engraving** | Leather | $100\%$ | $4500$ | High-speed processing |
| **Engraving** | Glass | $100\%$ | $1200$ | Surface MUST be painted black or covered with heat transfer paper |
| **Engraving** | Ceramic | $100\%$ | $1200$ | Surface MUST have heat transfer paper applied |
| **Engraving** | Acrylic | $100\%$ | $2500$ | Transparent acrylic requires surface painted black |
| **Engraving** | Stainless Steel | $100\%$ | $600$ | Direct marking |
| **Engraving** | Anodized Metal | $100\%$ | $1500$ | Direct marking |
| **Engraving** | Fabric | $20\%$ | $5000$ | Ultra-low power setting for light textiles |
| **Cutting** | $2\text{ mm}$ Thick Board | $100\%$ | $300$ | Pass: 1 pass |
| **Cutting** | $3\text{ mm}$ Thick Board | $100\%$ | $250$ | Pass: 1 pass |
| **Cutting** | $4\text{ mm}$ Thick Board | $100\%$ | $200$ | Pass: 1 pass |
| **Cutting** | $7\text{ mm}$ Thick Board | $100\%$ | $90$ | Reduce focal length appropriately into core depth |
| **Cutting** | Cardboard | $100\%$ | $2500$ | Pass: 1 pass |
| **Cutting** | Leather | $100\%$ | $2000$ | High-speed clean cutting |
| **Cutting** | Fabric | $100\%$ | $2500$ | High-speed clean cutting |

---

## 10. LaserGRBL Interface Button & Toolbar Quick Reference

| Button Icon / Name | Function Description | Recommended Usage Context |
| :--- | :--- | :--- |
| **Reset (Lightning Bolt)** | Immediate soft reset of controller state board. | Used when pausing, stopping errors, or recovering from hard fault states. |
| **Return to Home (House)** | Moves X and Y axes to mechanical limit switches / origin ($0,0$). | Recommended prior to running large-scale jobs to establish zero reference. |
| **Unlock (Open Padlock)** | Sends `$X` unlock command to clear alarm status flags. | Required immediately after system startup or collision reset. |
| **Set Origin (Crosshair)** | Sets current real-time coordinate position as program origin ($X0, Y0$). | Clicked after manually moving laser focus head over job stock corner. |
| **Frame / Preview (Square Box)** | Drives optical head around the bounding rectangle perimeter of job graphic. | Used prior to firing to verify physical material alignment and clearance. |
| **Open Light / Focus Laser (Lightbulb)** | Turns on laser diode at ultra-low output power ($<1\%$) for positioning. | If no visible beam appears, right-click button to edit low power $F$ power parameter. |
| **Lines Indicator Bar** | Displays total line count of G-code program. | Benchmark metric: higher line counts linearly increase job duration. |

---

## 11. Comprehensive Troubleshooting Guide

### Issue 1: Unable to connect LaserGRBL to COMGO Z1 machine

#### Diagnostic Steps & Solutions:
1. **Driver Absence:** Check Windows Device Manager for missing serial driver (`USB-SERIAL CH340`). Re-run `CH340SER.EXE` installer under `Tools` menu.
2. **Incorrect Baud Rate:** Verify software connection parameters dropdown is explicitly set to **`115200`** (Default GRBL standard rate).
3. **Firmware Version Incompatibility / Immediate Disconnection:**
   - If unit drops connection immediately upon opening software, open LightBurn to check mainboard firmware version tag.
   - If version reports `COMGO V1.0`, upgrade firmware to latest stable release via [Comgrow Google Drive Firmware Repository](https://drive.google.com/drive/folders/1YP-jvHf4-4DqBkkCXpYm6Bc9hpi_QqQII?usp=sharing).
4. **Physical Line Failure:** Swap out standard USB cable for shielded high-speed data transmission cable.

---

### Issue 2: X-Axis hits hardware boundary during continuous grayscale or long jobs

#### Diagnostic Steps & Solutions:
1. **Over-sized Graphic Configuration:** Verify target image dimension parameters in image configuration popup do not exceed maximum axis bounds ($400\text{ mm} \times 400\text{ mm}$).
2. **Soft Limits Disabled:**
   - Open console, type `$$` and hit Enter to print GRBL parameters list.
   - Verify `$20` parameter value.
   - If `$20=0`, change to **`$20=1`** to activate soft limit software bounds checking.

#### Recommended Core GRBL Configuration Checklist ($$)
```text
$11 = 0.010  (Junction deviation, mm)
$12 = 0.002  (Arc tolerance, mm)
$13 = 0      (Report in inches: 0 = mm, 1 = inches)
$20 = 1      (Soft limits enable: 0 = disable, 1 = enable)
$21 = 1      (Hard limits enable: 0 = disable, 1 = enable)
$22 = 1      (Homing cycle enable: 0 = disable, 1 = enable)
```

---

### Issue 3: Machine completely stops moving during job execution

#### Diagnostic Steps & Solutions:
1. **Serial Connection Loss:** Verify software status indicator shows active connected session (`COM3`, `115200`).
2. **Power Supply Failure:** Check main board LED indicator light. Ensure red LED power source light remains solidly illuminated.
3. **Gyroscope / Tilt Alarm Triggered:**
   - Check bottom right corner of LaserGRBL window for red **ALARM** status banner.
   - A triggered onboard gyroscope sensor lock halts machine motion if bumped/tilted.
   - Type `$$` in console line and inspect parameter **`$140`**.
   - Set **`$140=16`** (or appropriate sensitivity threshold), click **Reset** and **Unlock** buttons to clear the alarm state.

---

### Issue 4: "Soft Limit" Fault Message displayed in Console

#### Diagnostic Steps & Solutions:
1. Read status console message:
   ```text
   ALARM: Soft Limit
   [MSG: Reset to continue]
   ```
2. Cause: Planned move path commands exceed coordinate limits set by software envelope ($400 \times 400\text{ mm}$).
3. Resolution:
   - Click **Reset Button** (Lightning bolt).
   - Click **Unlock Button** (Padlock).
   - Adjust job graphic size or reposition origin within printable limits, then restart job.

---
*End of Transcribed Documentation - COMGO Z1 LaserGRBL Manual V1.1*