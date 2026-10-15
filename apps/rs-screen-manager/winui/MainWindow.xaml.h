#pragma once
#include "MainWindow.g.h"
#include <vector>
#include <string>
#include <utility>
#include <windows.h>

namespace winrt::RSScreenManagerUI::implementation {
 struct MainWindow : MainWindowT<MainWindow> {
  MainWindow();
  ~MainWindow();

  void Root_Loaded(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Home_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Devices_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void MirrorPage_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void VirtualPage_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Gaming_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Mapper_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Profiles_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Diagnostics_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Settings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void History_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Help_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);

  void Refresh_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Mirror_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Virtual_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Stop_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Pair_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Connect_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Disconnect_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Advanced_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ApplyProfile_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void SaveSettings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void DeviceSelection_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void GridSelection_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);

 private:
  std::vector<std::wstring> serials_;
  std::vector<std::wstring> deviceStates_;
  std::vector<PROCESS_INFORMATION> children_;
  std::vector<std::pair<std::wstring,bool>> sessionInfo_;
  std::wstring history_;
  bool loaded_=false;
  bool syncing_=false;

  void navigate(int page);
  void refresh();
  void start(bool virtualDisplay);
  void startFor(const std::wstring& serial,bool virtualDisplay,bool save);
  void command(const std::wstring& args);
  void saveSettings();
  void loadSettings();
  void saveSessions();
  void restoreSessions();
  void updateSummary();
  std::wstring settingsPath() const;
  std::wstring tools(const wchar_t* file) const;
  std::wstring selected();
  std::wstring option(Microsoft::UI::Xaml::Controls::ComboBox const& combo) const;
  void status(const wchar_t* message);
 };
}
namespace winrt::RSScreenManagerUI::factory_implementation {
 struct MainWindow : MainWindowT<MainWindow, implementation::MainWindow> {};
}
