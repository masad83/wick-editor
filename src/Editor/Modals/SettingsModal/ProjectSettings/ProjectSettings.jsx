/*
 * Copyright 2018 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';
import ActionButton from 'Editor/Util/ActionButton/ActionButton'; 
import WickInput from 'Editor/Util/WickInput/WickInput';

import './_projectsettings.scss';

var classNames = require('classnames'); 

class ProjectSettings extends Component {
  constructor(props) {
    super(props);

    this.defaultName = "New Project";

    // Set minimums for project settings.
    // TODO: Add this to the engine.
    this.projectMinWidth = 1;
    this.projectMinHeight = 1;
    this.projectMinFramerate = 1;

    // Create presets.
    this.presets = [
      {
        name: "Default",
        width: 720,
        height: 405
      }, 
      {
        name: "Square",
        width: 600,
        height: 600
      }, 
      {
        name: "720p",
        width: 1280,
        height: 720
      }, 
      {
        name: "1080p",
        width: 1920,
        height: 1080
      }
    ]

    this.state = {
      name: this.props.project.name,
      width: this.props.project.width,
      height: this.props.project.height,
      framerate: this.props.project.framerate,
      backgroundColor: this.props.project.backgroundColor,
      preset: this.getPreset(this.props.project.width, this.props.project.height),
    }
  }

  componentDidUpdate = (prevProps) => {
    let values = ['name', 'width', 'height', 'framerate', 'backgroundColor'];
    let different = false;
    values.forEach((value) => {
      if (prevProps.project[value] !== this.props.project[value]) {
        different = true;
      }
    });

    if (different) {
      this.reset();
    }
  }

  getPreset = (width, height) => {
    let possiblePreset = this.presets.find(preset => preset.width === width);
    if (possiblePreset && possiblePreset.height === height) {
      return possiblePreset.name;
    } else {
      return "Custom";
    }
  }

  setPreset = (width, height) => {
    this.setState({
      preset: this.getPreset(width, height)
    }); 
  }

  changeProjectName = (proposedName) => {
    this.setState({
      name: proposedName,
    });
  }

  changeProjectWidth = (widthAsNumber) => {
    let cleanWidthAsNumber = (!widthAsNumber) ? this.projectMinWidth : Math.max(this.projectMinWidth, widthAsNumber);
    this.setState({
      width: cleanWidthAsNumber,
    });

    this.setPreset(cleanWidthAsNumber, this.state.height);
  }

  changeProjectHeight = (heightAsNumber) => {
    let cleanHeightAsNumber = (!heightAsNumber) ? this.projectMinHeight : Math.max(this.projectMinHeight, heightAsNumber);
    this.setState({
      height: cleanHeightAsNumber,
    });

    this.setPreset(this.state.width, cleanHeightAsNumber);
  }

  changeProjectFramerate = (framerateAsNumber) => {
    let cleanFramerateAsNumber = (!framerateAsNumber) ? this.projectMinFramerate : Math.max(this.projectMinFramerate, framerateAsNumber);
    this.setState({
      framerate: cleanFramerateAsNumber
    });
  }

  changeProjectBackgroundColor = (color) => {
    this.setState({
      backgroundColor: color,
    });
  }

  acceptProjectSettings = () => {
    let newSettings = {
      name: this.state.name === '' ? this.defaultName : this.state.name,
      width: this.state.width,
      height: this.state.height,
      backgroundColor: this.state.backgroundColor,
      framerate: this.state.framerate,
    }

    this.props.updateProjectSettings(newSettings);
  }

  reset = () => {
    this.setState({
      name: this.props.project.name,
      width: this.props.project.width,
      height: this.props.project.height,
      framerate: this.props.project.framerate,
      backgroundColor: this.props.project.backgroundColor,
      preset: this.getPreset(this.props.project.width, this.props.project.height)
    });
  }

  resetAndToggle = () => {
    this.reset();
    if (this.props.toggle) this.props.toggle();
  }

  renderNameObject = () => {
    return (
      <div className="project-setting-element">
        <div className="project-settings-property-label">
          Name
        </div>
        <div className="project-settings-property-container">
          <WickInput
              id="projectName"
              type="text"
              value={this.state.name}
              placeholder={this.defaultName}
              onChange={this.changeProjectName}
            />
        </div>
      </div>
    );
  }

  renderFramerateObject = () => {
    return (
      <div className="project-setting-element">
        <div className="project-settings-property-label">
        Framerate (FPS)
        </div>
        <div className="project-settings-property-container">
          <WickInput
          id="projectFramerate"
          type="numeric"
          min={this.projectMinFramerate}
          value={this.state.framerate}
          onChange={this.changeProjectFramerate} />
        </div>
      </div>
    );
  }

  renderSizeObject = () => {
    return (
      <div className="project-setting-element">
        <div className="project-settings-property-label">
          Size (W x H)
        </div>
        <div className="project-settings-property-container project-settings-size-input-container">
            <WickInput
              id="projectWidth"
              type="numeric"
              min={this.projectMinWidth}
              value={this.state.width}
              onChange = {this.changeProjectWidth}
              className="project-settings-size-input" />
            <div className="project-settings-split">x</div>
            <WickInput
              id="projectHeight"
              type="numeric"
              min={this.projectMinHeight}
              value={this.state.height}
              onChange={this.changeProjectHeight} 
              className="project-settings-size-input" /> 
        </div>
      </div>
    );
  }

  renderBackgroundColorObject = () => {
    return (
      <div className="project-setting-element">
        <div className="project-settings-property-label">
          Background Color
        </div>
        <div className="project-settings-property-container">
          <WickInput
            type="color"
            id="project-background-color-picker"
            disableAlpha={true}
            placement={'bottom'}
            color={this.state.backgroundColor}
            onChange={this.changeProjectBackgroundColor} />
        </div>
      </div>
    );
  }

  selectPreset = (preset) => {
    this.setState({
      width: preset.width,
      height: preset.height,
      preset: preset.name,
    });
  }

  renderPresetBoxes = () => {
    return (
      <div className="preset-boxes">
        {this.presets.map((preset,i) => {
          return <div key={"preset-box-" + i}
                      className={ classNames("project-settings-modal-preset", {"selected" : this.state.preset === preset.name})}
                      onClick={() => this.selectPreset(preset)}>{preset.name}</div>
        })}
      </div>
    );
  }

  renderPresets = () => {
    return (
      <div className="project-setting-element project-settings-presets-container">
        <div className="project-settings-property-label">
          Presets
        </div>
        <div className="project-settings-presets-body-container">
          {this.renderPresetBoxes()}
        </div>
      </div>
    )
  }

  render() {
    return (
        <div id="project-settings-interior-content">
          {/* Body */}
          <div id="project-settings-modal-body">
            <div className="project-settings-modal-row">
              {this.renderNameObject()}
              {this.renderBackgroundColorObject()}
            </div>
            <div className="project-settings-modal-row">
              {this.renderSizeObject()}
              {this.renderFramerateObject()}
            </div>
            <div className="project-settings-modal-row">
              {this.renderPresets()}
            </div>
          </div>
          {/* Footer */}
          <div id="project-settings-modal-footer">
            <div id="project-settings-modal-cancel">
                <ActionButton 
                  className="project-settings-modal-button"
                  color='gray'
                  action={this.resetAndToggle}
                  text="Cancel"
                  />
              </div>
              <div id="autosave-modal-accept">
                <ActionButton 
                  className="autosave-modal-button"
                  color='green'
                  action={this.acceptProjectSettings}
                  text="Apply"
                  />
              </div>
          </div>
        </div>
    );
  }
}

export default ProjectSettings