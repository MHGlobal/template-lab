#pragma once
#include "MainWindow.g.h"
#include <vector>
#include <string>
#include <windows.h>

namespace winrt::RSScreenManagerUI::implementation {
 struct MainWindow : MainWindowT<MainWindow> {
  MainWindow();
  ~MainWindow();
  void Refresh_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Mirror_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Virtual_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Stop_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Pair_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Connect_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Disconnect_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Advanced_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
 private:
  std::vector<std::wstring> serials_;
  std::vector<PROCESS_INFORMATION> children_;
  void refresh();
  void start(bool virtualDisplay);
  void command(const std::wstring& args);
  std::wstring tools(const wchar_t* file) const;
  std::wstring selected();
  std::wstring option(Microsoft::UI::Xaml::Controls::ComboBox const& combo) const;
  void status(const wchar_t* message);
 };
}
namespace winrt::RSScreenManagerUI::factory_implementation {
 struct MainWindow : MainWindowT<MainWindow, implementation::MainWindow> {};
}
